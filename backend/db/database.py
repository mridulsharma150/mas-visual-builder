from sqlalchemy import (
    create_engine, Column, String, Integer, Text, DateTime, Float
)
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mas_builder.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Workflow(Base):
    __tablename__ = "workflows"
    id          = Column(String, primary_key=True)
    name        = Column(String, nullable=False)
    topology    = Column(String, nullable=False)
    config_json = Column(Text, nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)


class Experiment(Base):
    __tablename__ = "experiments"
    id            = Column(String, primary_key=True)
    workflow_id   = Column(String, nullable=False)
    workflow_name = Column(String)
    status        = Column(String, default="running")
    input_prompt  = Column(Text)
    output_text   = Column(Text)
    logs_json     = Column(Text)
    latency_ms    = Column(Float)
    total_tokens  = Column(Integer)
    agent_calls   = Column(Integer)
    created_at    = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
