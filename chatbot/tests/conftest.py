import importlib.util
import os
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"

os.environ.setdefault("RAG_INDEX_BUCKET", "test-index-bucket")
os.environ.setdefault("RATE_LIMIT_TABLE", "test-rate-limit-table")
os.environ.setdefault("BEDROCK_MODEL_ID", "test-model")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_SESSION_TOKEN", "testing")
os.environ.setdefault("AWS_DEFAULT_REGION", "us-west-2")

sys.path[:0] = [str(SRC / "ingestion"), str(SRC / "orchestrator")]


# Both Lambdas name their entry module app.py, so each gets a distinct alias.
def _load(alias, path):
    spec = importlib.util.spec_from_file_location(alias, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[alias] = module
    spec.loader.exec_module(module)


_load("ingestion_app", SRC / "ingestion" / "app.py")
_load("orchestrator_app", SRC / "orchestrator" / "app.py")
