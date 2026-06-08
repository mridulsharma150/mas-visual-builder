"""
Six pure-function LangGraph nodes for the data-analysis pipeline.
Each node receives the shared state dict and returns an updated copy.
"""
import os
import io
import json
import base64
from typing import Dict, Any

import numpy as np
import pandas as pd
from scipy import stats


# ─────────────────────────────────────────────
# NODE 1 — INGESTION
# ─────────────────────────────────────────────
def ingestion_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Parse raw bytes (CSV / JSON / TSV / Excel) into a DataFrame and build a profile."""
    raw: bytes = state.get("raw_bytes", b"")
    filename: str = state.get("filename", "upload.csv")
    ext = filename.rsplit(".", 1)[-1].lower()

    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(raw))
        elif ext in ("xls", "xlsx"):
            df = pd.read_excel(io.BytesIO(raw))
        elif ext == "json":
            df = pd.read_json(io.BytesIO(raw))
        elif ext == "tsv":
            df = pd.read_csv(io.BytesIO(raw), sep="\t")
        else:
            raise ValueError(f"Unsupported file type: .{ext}")
    except Exception as exc:
        state["errors"].append(f"[Ingestion] {exc}")
        return state

    profile = {
        "shape": list(df.shape),
        "columns": df.columns.tolist(),
        "dtypes": df.dtypes.astype(str).to_dict(),
        "null_counts": df.isnull().sum().to_dict(),
        "null_pct": (df.isnull().mean() * 100).round(2).to_dict(),
        "memory_kb": round(df.memory_usage(deep=True).sum() / 1024, 2),
        "sample": df.head(5).to_dict(orient="records"),
    }

    state["df"] = df
    state["profile"] = profile
    state["logs"].append({
        "agent": "ingestion",
        "status": "ok",
        "detail": f"Loaded {df.shape[0]:,} rows \u00d7 {df.shape[1]} cols from '{filename}'"
    })
    return state


# ─────────────────────────────────────────────
# NODE 2 — CLEANING
# ─────────────────────────────────────────────
def cleaning_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """De-duplicate, impute nulls, fix dtypes, clip outliers via IQR."""
    if state.get("df") is None:
        return state

    df: pd.DataFrame = state["df"].copy()
    before_rows = len(df)

    # 1. Drop fully duplicate rows
    df.drop_duplicates(inplace=True)

    # 2. Numeric imputation — median (pandas 3.0-safe pattern)
    num_cols = df.select_dtypes(include="number").columns.tolist()
    for col in num_cols:
        df[col] = df[col].fillna(df[col].median())

    # 3. Categorical imputation — mode (pandas 3.0-safe pattern)
    cat_cols = df.select_dtypes(include="object").columns.tolist()
    for col in cat_cols:
        mode_val = df[col].mode()
        df[col] = df[col].fillna(mode_val[0] if len(mode_val) else "Unknown")

    # 4. Auto-parse date-like string columns (>70% parseable)
    #    infer_datetime_format removed — deprecated since pandas 2.0
    for col in cat_cols:
        try:
            parsed = pd.to_datetime(df[col], errors="coerce")
            if parsed.notna().sum() / max(len(df), 1) > 0.7:
                df[col] = parsed
        except Exception:
            pass

    # 5. IQR outlier clipping — cap rather than remove
    for col in num_cols:
        q1, q3 = df[col].quantile(0.25), df[col].quantile(0.75)
        iqr = q3 - q1
        if iqr > 0:
            df[col] = df[col].clip(lower=q1 - 1.5 * iqr, upper=q3 + 1.5 * iqr)

    dropped = before_rows - len(df)
    state["df"] = df
    state["logs"].append({
        "agent": "cleaning",
        "status": "ok",
        "detail": (
            f"Removed {dropped} duplicate rows. "
            f"Imputed nulls (numeric\u2192median, categorical\u2192mode). "
            f"IQR-clipped {len(num_cols)} numeric columns."
        )
    })
    return state


# ─────────────────────────────────────────────
# NODE 3 — ANALYSIS
# ─────────────────────────────────────────────
def analysis_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Descriptive stats, Pearson correlations, skewness, Shapiro-Wilk normality."""
    df: pd.DataFrame = state.get("df")
    if df is None:
        return state

    num_df = df.select_dtypes(include="number")
    cat_df = df.select_dtypes(include="object")

    # BUG1 FIX: Guard against empty numeric DataFrame (categorical-only datasets)
    desc     = num_df.describe().round(4).to_dict() if not num_df.empty else {}
    skewness = num_df.skew().round(4).to_dict()     if not num_df.empty else {}
    kurtosis = num_df.kurt().round(4).to_dict()     if not num_df.empty else {}

    corr_matrix      = {}
    top_correlations = []
    if len(num_df.columns) > 1:
        corr = num_df.corr().round(4)
        corr_matrix = corr.to_dict()
        upper = corr.abs().where(
            np.triu(np.ones(corr.shape), k=1).astype(bool)
        )
        top_pairs = upper.stack().nlargest(8)
        top_correlations = [
            {"pair": f"{a} \u2194 {b}", "pearson_r": round(v, 4)}
            for (a, b), v in top_pairs.items()
        ]

    # Shapiro-Wilk normality test (sample up to 5000)
    normality = {}
    for col in num_df.columns:
        sample = num_df[col].dropna().sample(
            min(len(num_df), 5000), random_state=42
        )
        try:
            stat, p = stats.shapiro(sample)
            normality[col] = {
                "stat": round(float(stat), 4),
                "p_value": round(float(p), 6),
                "normal": bool(p > 0.05),
            }
        except Exception:
            normality[col] = {"stat": None, "p_value": None, "normal": None}

    # Top-10 value counts per categorical column
    category_counts = {
        col: df[col].value_counts().head(10).to_dict()
        for col in cat_df.columns
    }

    state["analysis"] = {
        "descriptive_stats":  desc,
        "skewness":           skewness,
        "kurtosis":           kurtosis,
        "correlation_matrix": corr_matrix,
        "top_correlations":   top_correlations,
        "normality_tests":    normality,
        "category_counts":    category_counts,
    }
    state["logs"].append({
        "agent": "analysis",
        "status": "ok",
        "detail": (
            f"Stats computed for {len(num_df.columns)} numeric, "
            f"{len(cat_df.columns)} categorical columns. "
            f"Top correlation: {top_correlations[0] if top_correlations else 'N/A'}"
        )
    })
    return state


# ─────────────────────────────────────────────
# NODE 4 — INSIGHT (LLM + rule-based fallback)
# ─────────────────────────────────────────────
def insight_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Call an LLM to generate human-readable narrative insights."""
    analysis = state.get("analysis", {})
    profile  = state.get("profile", {})
    model_id = state.get("llm_model", "mock")

    desc_summary = json.dumps(analysis.get("descriptive_stats", {}), indent=2)[:3000]
    top_corr     = json.dumps(analysis.get("top_correlations", []), indent=2)
    skew_summary = json.dumps(analysis.get("skewness", {}), indent=2)
    normality    = json.dumps(analysis.get("normality_tests", {}), indent=2)[:1500]

    prompt = (
        "You are a senior data scientist writing a professional analysis report.\n\n"
        f"Dataset: {profile.get('shape', [])} shape, columns: {profile.get('columns', [])}\n"
        f"Null percentages: {profile.get('null_pct', {})}\n\n"
        f"Descriptive Statistics:\n{desc_summary}\n\n"
        f"Top Correlations:\n{top_corr}\n\n"
        f"Skewness:\n{skew_summary}\n\n"
        f"Normality Tests (Shapiro-Wilk):\n{normality}\n\n"
        "Generate a structured insight report with:\n"
        "1. **Executive Summary** (2-3 sentences)\n"
        "2. **Key Findings** (5-7 bullet points with specific numbers)\n"
        "3. **Data Quality Notes** (nulls, outliers, skew warnings)\n"
        "4. **Correlation Insights** (what the top correlations imply)\n"
        "5. **Recommended Next Steps** (modelling, further analysis, business actions)\n\n"
        "Be specific, use actual numbers from the stats. Write for a business + technical audience."
    )

    try:
        from core.agent_factory import _get_llm
        llm = _get_llm(model_id)
        response = llm.invoke([{"role": "user", "content": prompt}])
        insights = response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        insights = _rule_based_insights(analysis, profile)
        state["logs"].append({"agent": "insight", "status": "fallback", "detail": str(exc)})

    state["insights"] = insights
    state["logs"].append({
        "agent": "insight",
        "status": "ok",
        "detail": f"Insights generated ({len(insights)} chars)"
    })
    return state


def _rule_based_insights(analysis: dict, profile: dict) -> str:
    """Generates structured insights without an LLM — always works offline."""
    lines = ["## Automated Data Insights\n"]
    shape = profile.get("shape", [0, 0])
    lines.append(f"**Dataset**: {shape[0]:,} rows \u00d7 {shape[1]} columns\n")

    desc = analysis.get("descriptive_stats", {})
    if desc:
        lines.append("\n### Key Statistics")
        for col, s in list(desc.items())[:5]:
            lines.append(f"- **{col}**: mean={s.get('mean','N/A')}, std={s.get('std','N/A')}, "
                         f"min={s.get('min','N/A')}, max={s.get('max','N/A')}")

    top_corrs = analysis.get("top_correlations", [])
    if top_corrs:
        lines.append("\n### Top Correlations")
        for c in top_corrs[:5]:
            lines.append(f"- {c['pair']}: r = {c['pearson_r']}")

    skew = analysis.get("skewness", {})
    highly_skewed = {k: v for k, v in skew.items() if abs(v) > 1}
    if highly_skewed:
        lines.append("\n### Skew Warnings")
        for col, sk in highly_skewed.items():
            direction = "right" if sk > 0 else "left"
            lines.append(f"- \u26a0\ufe0f `{col}` is {direction}-skewed (skewness={sk}). Consider log-transform.")

    normality = analysis.get("normality_tests", {})
    non_normal = {k: v for k, v in normality.items() if v.get("normal") is False}
    if non_normal:
        lines.append("\n### Non-Normal Distributions")
        for col, v in list(non_normal.items())[:5]:
            lines.append(f"- `{col}`: p={v['p_value']} (non-normal \u2014 use non-parametric tests)")

    lines.append("\n### Recommended Next Steps")
    lines.append("- Review columns with high null percentages before modelling")
    lines.append("- Apply log or Box-Cox transform on highly skewed features")
    lines.append("- Investigate top correlated pairs for multicollinearity before regression")
    lines.append("- Use robust scalers (MinMax or RobustScaler) given outlier presence")
    lines.append("- Consider feature selection based on correlation matrix before ML")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# NODE 5 — VISUALIZATION
# ─────────────────────────────────────────────
def visualization_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Auto-generate Plotly charts; return base64 PNGs + JSON specs."""
    df: pd.DataFrame = state.get("df")
    if df is None:
        return state

    import plotly.express as px
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots

    num_cols  = df.select_dtypes(include="number").columns.tolist()
    cat_cols  = df.select_dtypes(include="object").columns.tolist()
    date_cols = df.select_dtypes(include="datetime").columns.tolist()

    charts   = []
    template = "plotly_dark"
    os.makedirs("outputs/charts", exist_ok=True)

    def _fig_to_artifacts(fig, title: str, chart_type: str):
        spec = fig.to_json()
        try:
            png_bytes = fig.to_image(format="png", width=1000, height=500, scale=2)
            b64 = base64.b64encode(png_bytes).decode()
        except Exception:
            b64 = None
        charts.append({"title": title, "type": chart_type,
                        "plotly_json": spec, "base64_png": b64})

    # ── Chart 1: Histogram grid (up to 4 numeric cols)
    if num_cols:
        cols_to_plot = num_cols[:4]
        n = len(cols_to_plot)
        fig = make_subplots(rows=1, cols=n, subplot_titles=cols_to_plot)
        for i, col in enumerate(cols_to_plot, 1):
            fig.add_trace(
                go.Histogram(x=df[col], name=col, nbinsx=40,
                             marker_color="#6366f1", opacity=0.85),
                row=1, col=i
            )
        fig.update_layout(title_text="Distribution of Numeric Features",
                          template=template, showlegend=False, height=420)
        _fig_to_artifacts(fig, "Feature Distributions", "histogram_grid")

    # ── Chart 2: Correlation heatmap
    if len(num_cols) > 1:
        corr = df[num_cols].corr().round(3)
        fig = px.imshow(
            corr, text_auto=True, aspect="auto",
            color_continuous_scale="RdBu_r", zmin=-1, zmax=1,
            title="Correlation Heatmap",
        )
        fig.update_layout(template=template, height=500)
        _fig_to_artifacts(fig, "Correlation Heatmap", "heatmap")

    # ── Chart 3: Box plots
    if num_cols:
        fig = go.Figure()
        for col in num_cols[:6]:
            fig.add_trace(go.Box(y=df[col], name=col, boxmean="sd"))
        fig.update_layout(title="Box Plots \u2014 Spread & Outliers",
                          template=template, height=450)
        _fig_to_artifacts(fig, "Box Plots", "boxplot")

    # ── Chart 4: Top-category bar chart
    if cat_cols:
        col = cat_cols[0]
        vc  = df[col].value_counts().head(12)
        fig = px.bar(
            x=vc.index, y=vc.values,
            labels={"x": col, "y": "Count"},
            title=f"Category Distribution: {col}",
            color=vc.values, color_continuous_scale="Viridis",
        )
        fig.update_layout(template=template, height=420, showlegend=False)
        _fig_to_artifacts(fig, f"Category: {col}", "bar_chart")

    # ── Chart 5: Scatter matrix (top 4 numeric)
    if len(num_cols) >= 2:
        cols = num_cols[:4]
        color_col = cat_cols[0] if cat_cols else None
        plot_df = df[cols + ([color_col] if color_col else [])]
        fig = px.scatter_matrix(
            plot_df,
            dimensions=cols,
            color=color_col,
            title="Scatter Matrix",
            opacity=0.6,
        )
        fig.update_traces(diagonal_visible=False)
        fig.update_layout(template=template, height=600)
        _fig_to_artifacts(fig, "Scatter Matrix", "scatter_matrix")

    # ── Chart 6: Time-series line chart
    if date_cols and num_cols:
        date_col = date_cols[0]
        val_col  = num_cols[0]
        ts = df[[date_col, val_col]].dropna().sort_values(date_col)
        fig = px.line(ts, x=date_col, y=val_col,
                      title=f"{val_col} over Time", markers=True)
        fig.update_layout(template=template, height=420)
        _fig_to_artifacts(fig, f"{val_col} Time Series", "line_chart")

    # ── Chart 7: Missing-value bar
    null_pct = df.isnull().mean() * 100
    if null_pct.max() > 0:
        fig = px.bar(
            x=null_pct.index, y=null_pct.values,
            labels={"x": "Column", "y": "% Missing"},
            title="Missing Value % per Column",
            color=null_pct.values, color_continuous_scale="Reds",
        )
        fig.update_layout(template=template, height=380)
        _fig_to_artifacts(fig, "Missing Values", "missing_heatmap")

    state["charts"] = charts
    state["logs"].append({
        "agent": "visualization",
        "status": "ok",
        "detail": f"{len(charts)} charts generated"
    })
    return state


# ─────────────────────────────────────────────
# NODE 6 — REPORT
# ─────────────────────────────────────────────
def report_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Assemble a comprehensive Markdown report from all prior nodes."""
    from datetime import datetime, timezone
    from jinja2 import Template

    REPORT_TMPL = """# \U0001f4ca Data Analysis Report \u2014 {{ filename }}

> **Generated:** {{ ts }} | **Shape:** {{ rows }} rows \u00d7 {{ cols }} cols | **Pipeline:** MAS Visual Builder v2

---

## 1. Dataset Profile

| Property | Value |
|---|---|
| **Rows** | {{ rows }} |
| **Columns** | {{ cols }} |
| **Memory** | {{ memory_kb }} KB |
| **Column Names** | {{ column_list }} |

### Null Summary
{% for col, pct in null_pct.items() %}{% if pct > 0 %}
- `{{ col }}`: {{ pct }}% missing{% endif %}{% endfor %}
{% if null_ok %}\u2705 No missing values detected.{% endif %}

---

## 2. Statistical Analysis

### Top Pearson Correlations
{% for c in top_corrs %}
- **{{ c.pair }}** \u2192 r = `{{ c.pearson_r }}`
{% endfor %}

### Skewness Flags
{% for col, sk in skewness.items() %}{% if sk > 1 or sk < -1 %}
- \u26a0\ufe0f `{{ col }}` is {{ 'right' if sk > 0 else 'left' }}-skewed (skewness = {{ sk }})
{% endif %}{% endfor %}

---

## 3. AI-Generated Insights

{{ insights }}

---

## 4. Visualizations

{{ chart_count }} charts were auto-generated and are available in the API response under `charts[]`.

Chart types produced:
{% for chart in chart_titles %}
- **{{ chart }}**
{% endfor %}

---

## 5. Execution Log

{% for log in logs %}
- **[{{ log.agent }}]** `{{ log.status }}` \u2014 {{ log.detail }}
{% endfor %}

---
*Report generated by MAS Visual Builder \u2014 Multi-Agent Data Analysis System*
"""

    profile   = state.get("profile", {})
    analysis  = state.get("analysis", {})
    null_pct  = profile.get("null_pct", {})
    top_corrs = analysis.get("top_correlations", [])
    skewness  = analysis.get("skewness", {})
    charts    = state.get("charts", [])

    report = Template(REPORT_TMPL).render(
        filename=state.get("filename", "dataset"),
        ts=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        rows=profile.get("shape", [0, 0])[0],
        cols=profile.get("shape", [0, 0])[1],
        memory_kb=profile.get("memory_kb", "N/A"),
        column_list=", ".join(f"`{c}`" for c in profile.get("columns", [])),
        null_pct=null_pct,
        null_ok=all(v == 0 for v in null_pct.values()),
        top_corrs=top_corrs,
        skewness=skewness,
        insights=state.get("insights", "_No insights available_"),
        chart_count=len(charts),
        chart_titles=[c["title"] for c in charts],
        logs=state.get("logs", []),
    )

    state["report"] = report
    state["logs"].append({
        "agent": "report",
        "status": "ok",
        "detail": f"Report assembled ({len(report)} chars)"
    })
    return state
