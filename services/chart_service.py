"""Chart generation (headless matplotlib)."""

from __future__ import annotations

import base64
import io
import logging

import os

# Ensure matplotlib uses a valid cache dir to avoid permission warnings and slow scans
if "MPLCONFIGDIR" not in os.environ:
    os.environ["MPLCONFIGDIR"] = "/tmp/finovo_mpl_cache"

logger = logging.getLogger(__name__)


def generate_chart_base64(hist, title: str = "Price Chart") -> str:
    """Encode a simple close-price chart as base64 PNG."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        plt.figure(figsize=(10, 4))
        plt.plot(hist.index, hist["Close"], label="Close Price", color="cyan")
        plt.title(title)
        plt.xlabel("Date")
        plt.ylabel("Price")
        plt.grid(True)
        plt.legend()
        buf = io.BytesIO()
        plt.savefig(buf, format="png")
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode()
    except Exception as e:
        logger.exception("generate_chart_base64 failed: %s", e)
        raise
