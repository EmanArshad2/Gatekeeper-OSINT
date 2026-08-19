import asyncio
import logging
import traceback
from typing import Any, Awaitable, Callable, Dict
logger = logging.getLogger("gatekeeper-collector-manager")
class CollectorManager:
    """
    Central lifecycle and telemetry manager for Gatekeeper collectors.
    Responsibilities:
    - Start collectors as asyncio tasks
    - Prevent duplicate collector instances
    - Stop/cancel collectors
    - Track running state
    - Track processed items
    - Track wallets/images/PDFs/QRs
    - Track collector errors
    - Expose collector status to the API
    """
    DEFAULT_STATUS = {
        "running": False,
        "processed": 0,
        "wallets": 0,
        "images": 0,
        "pdfs": 0,
        "qrs": 0,
        "errors": 0,
        "last_error": None,
    }
    def __init__(self):
        self.tasks: Dict[str, asyncio.Task] = {}
        self.status: Dict[str, Dict[str, Any]] = {}
    # ========================================================
    # START COLLECTOR
    # ========================================================
    async def start(
        self,
        name: str,
        coroutine: Callable[[], Awaitable[Any]],
    ) -> bool:
        name = str(name).strip().lower()
        if not name:
            logger.warning(
                "Cannot start collector with empty name."
            )
            return False
        # ----------------------------------------------------
        # Check existing task
        # ----------------------------------------------------
        existing = self.tasks.get(name)
        if existing and not existing.done():
            logger.info(
                "[COLLECTOR:%s] Already running",
                name,
            )
            return False
        # ----------------------------------------------------
        # Initialize / reset runtime status
        # ----------------------------------------------------
        self.status[name] = {
            **self.DEFAULT_STATUS,
            "running": True,
        }
        logger.info(
            "[COLLECTOR:%s] Starting collector",
            name,
        )
        # ----------------------------------------------------
        # Create task
        # ----------------------------------------------------
        task = asyncio.create_task(
            self._run_collector(
                name,
                coroutine,
            ),
            name=f"collector:{name}",
        )
        self.tasks[name] = task
        return True
    # ========================================================
    # INTERNAL COLLECTOR RUNNER
    # ========================================================
    async def _run_collector(
        self,
        name: str,
        coroutine: Callable[[], Awaitable[Any]],
    ):
        try:
            logger.info(
                "[COLLECTOR:%s] Collector task started",
                name,
            )
            await coroutine()
        # ----------------------------------------------------
        # Normal cancellation
        # ----------------------------------------------------
        except asyncio.CancelledError:
            logger.info(
                "[COLLECTOR:%s] Collector cancelled",
                name,
            )
            raise
        # ----------------------------------------------------
        # Collector crash
        # ----------------------------------------------------
        except Exception as exc:
            error_message = (
                str(exc).strip()
                or repr(exc)
            )
            self.status.setdefault(
                name,
                {
                    **self.DEFAULT_STATUS,
                },
            )
            self.status[name]["errors"] = (
                self.status[name].get(
                    "errors",
                    0,
                )
                + 1
            )
            self.status[name]["last_error"] = (
                error_message
            )
            logger.exception(
                "[COLLECTOR:%s] Collector crashed: %s",
                name,
                error_message,
            )
            traceback.print_exc()
        # ----------------------------------------------------
        # Always mark stopped
        # ----------------------------------------------------
        finally:
            if name in self.status:
                self.status[name]["running"] = False
            logger.info(
                "[COLLECTOR:%s] Collector stopped",
                name,
            )
    # ========================================================
    # STOP COLLECTOR
    # ========================================================
    async def stop(
        self,
        name: str,
    ) -> bool:
        name = str(name).strip().lower()
        task = self.tasks.get(name)
        if not task:
            if name in self.status:
                self.status[name]["running"] = False
            return True
        # ----------------------------------------------------
        # Cancel active task
        # ----------------------------------------------------
        if not task.done():
            logger.info(
                "[COLLECTOR:%s] Stopping collector",
                name,
            )
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            except Exception as exc:
                logger.warning(
                    "[COLLECTOR:%s] Error while stopping: %s",
                    name,
                    exc,
                )
        # ----------------------------------------------------
        # Update status
        # ----------------------------------------------------
        if name in self.status:
            self.status[name]["running"] = False
        return True
    # ========================================================
    # STOP ALL
    # ========================================================
    async def stop_all(self):
        names = list(
            self.tasks.keys()
        )
        for name in names:
            try:
                await self.stop(name)
            except Exception as exc:
                logger.warning(
                    "[COLLECTOR:%s] Failed to stop: %s",
                    name,
                    exc,
                )
    # ========================================================
    # UPDATE STATUS
    # ========================================================
    def update(
        self,
        name: str,
        **kwargs,
    ):
        name = str(name).strip().lower()
        if name not in self.status:
            return
        self.status[name].update(
            kwargs
        )
    # ========================================================
    # INCREMENT METRIC
    # ========================================================
    def increment(
        self,
        name: str,
        field: str,
        amount: int = 1,
    ):
        name = str(name).strip().lower()
        if name not in self.status:
            return
        # Protect against invalid metric names.
        if field not in self.DEFAULT_STATUS:
            logger.warning(
                "[COLLECTOR:%s] Unknown status field: %s",
                name,
                field,
            )
            return
        # Error count is numeric.
        # last_error/running are not valid increment targets.
        if field in {
            "running",
            "last_error",
        }:
            logger.warning(
                "[COLLECTOR:%s] Cannot increment field: %s",
                name,
                field,
            )
            return
        try:
            amount = int(amount)
        except (
            TypeError,
            ValueError,
        ):
            amount = 1
        self.status[name][field] = (
            self.status[name].get(
                field,
                0,
            )
            + amount
        )
    # ========================================================
    # SET ERROR
    # ========================================================
    def set_error(
        self,
        name: str,
        error: str,
    ):
        name = str(name).strip().lower()
        if name not in self.status:
            return
        message = (
            str(error).strip()
            or "Unknown collector error"
        )
        self.status[name]["errors"] = (
            self.status[name].get(
                "errors",
                0,
            )
            + 1
        )
        self.status[name]["last_error"] = (
            message
        )
    # ========================================================
    # CLEAR ERROR
    # ========================================================
    def clear_error(
        self,
        name: str,
    ):
        name = str(name).strip().lower()
        if name not in self.status:
            return
        self.status[name]["last_error"] = None
    # ========================================================
    # GET STATUS
    # ========================================================
    def get_status(self):
        # Return a copy so API consumers cannot accidentally
        # mutate internal manager state.
        return {
            name: data.copy()
            for name, data in self.status.items()
        }
# ============================================================
# GLOBAL COLLECTOR MANAGER
# ============================================================
collector_manager = CollectorManager()