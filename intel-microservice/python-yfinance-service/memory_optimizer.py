"""
Memory optimization utilities for Intel microservice
Prevents OOM kills on t3.micro (1GB RAM) instances
"""
import psutil
import gc
import logging
import os
from typing import Dict, Any

logger = logging.getLogger(__name__)

class MemoryManager:
    """Manages memory usage and prevents OOM kills"""

    def __init__(self, max_memory_percent=80):
        """
        Initialize memory manager
        Args:
            max_memory_percent: Maximum memory usage before triggering cleanup (default 80%)
        """
        self.max_memory_percent = max_memory_percent
        self.process = psutil.Process(os.getpid())

    def get_memory_usage(self) -> Dict[str, Any]:
        """Get current memory usage statistics"""
        memory_info = self.process.memory_info()
        virtual_memory = psutil.virtual_memory()

        return {
            'rss_mb': memory_info.rss / 1024 / 1024,  # Resident Set Size in MB
            'vms_mb': memory_info.vms / 1024 / 1024,  # Virtual Memory Size in MB
            'percent': self.process.memory_percent(),
            'system_percent': virtual_memory.percent,
            'system_available_mb': virtual_memory.available / 1024 / 1024
        }

    def check_memory_pressure(self) -> bool:
        """Check if memory usage is above threshold"""
        usage = self.get_memory_usage()
        return usage['system_percent'] > self.max_memory_percent

    def aggressive_cleanup(self):
        """Perform aggressive garbage collection"""
        logger.warning("Memory pressure detected - performing aggressive cleanup")

        # Force garbage collection multiple times
        collected = 0
        for i in range(3):
            collected += gc.collect()

        logger.info(f"Garbage collection freed {collected} objects")

        # Log memory stats after cleanup
        usage = self.get_memory_usage()
        logger.info(f"Memory after cleanup: {usage['rss_mb']:.1f}MB RSS, {usage['system_percent']:.1f}% system")

    def should_limit_cache(self) -> bool:
        """Determine if caching should be limited due to memory pressure"""
        usage = self.get_memory_usage()
        # Start limiting cache at 60% memory usage
        return usage['system_percent'] > 60

    def log_memory_stats(self):
        """Log current memory statistics"""
        usage = self.get_memory_usage()
        logger.info(
            f"Memory: {usage['rss_mb']:.1f}MB RSS | "
            f"System: {usage['system_percent']:.1f}% | "
            f"Available: {usage['system_available_mb']:.1f}MB"
        )


def create_cache_cleanup_strategy(memory_manager: MemoryManager, caches: Dict[str, Any]):
    """
    Create a strategy to clean up caches when memory is high

    Args:
        memory_manager: MemoryManager instance
        caches: Dictionary of cache objects to manage
    """
    def cleanup_old_caches():
        """Clean up least recently used caches"""
        if not memory_manager.check_memory_pressure():
            return

        logger.warning("Memory pressure - cleaning up old caches")

        # Priority order for cache cleanup (keep most important, remove least important first)
        cleanup_priority = ['3mo', 'ytd', '1y', '1mo', '1w', '1d']

        for period in cleanup_priority:
            if period in caches and caches[period].get('data') is not None:
                logger.info(f"Clearing cache for period: {period}")
                caches[period]['data'] = None
                caches[period]['timestamp'] = 0

                # Check if we've freed enough memory
                if not memory_manager.check_memory_pressure():
                    logger.info("Memory pressure resolved")
                    break

        # Force garbage collection
        gc.collect()

    return cleanup_old_caches


# Global memory manager instance
memory_manager = MemoryManager(max_memory_percent=75)
