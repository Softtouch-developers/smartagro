"""
Background jobs using APScheduler
"""
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from database import SessionLocal
from models import EscrowTransaction, EscrowStatus, OTPVerification
from config import settings
import logging
import httpx

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def auto_release_escrow():
    """
    Auto-release escrow funds after expiry
    Runs every 6 hours
    """
    logger.info("Running auto-release escrow job...")
    
    db = SessionLocal()
    try:
        # Find escrows eligible for auto-release
        pending_escrows = db.query(EscrowTransaction).filter(
            EscrowTransaction.status == EscrowStatus.HELD,
            EscrowTransaction.auto_release_date <= datetime.utcnow()
        ).all()
        
        for escrow in pending_escrows:
            logger.info(f"Auto-releasing escrow {escrow.id}")
            
            # Import here to avoid circular import
            from modules.escrow.service import release_escrow_to_seller
            
            try:
                release_escrow_to_seller(escrow.id, db, auto_release=True)
                logger.info(f"✅ Escrow {escrow.id} auto-released")
            except Exception as e:
                logger.error(f"Failed to auto-release escrow {escrow.id}: {e}")
        
        logger.info(f"Auto-release job complete. Processed {len(pending_escrows)} escrows")
    
    finally:
        db.close()


def cleanup_expired_otps():
    """
    Delete expired OTPs
    Runs daily at 3 AM
    """
    logger.info("Running OTP cleanup job...")

    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=7)

        deleted = db.query(OTPVerification).filter(
            OTPVerification.expires_at < cutoff
        ).delete()

        db.commit()
        logger.info(f"✅ Deleted {deleted} expired OTPs")

    finally:
        db.close()


def expire_old_carts():
    """
    Expire shopping carts that have passed their expiration time
    Runs every hour
    """
    logger.info("Running cart expiration job...")

    db = SessionLocal()
    try:
        from modules.cart.service import CartService
        expired_count = CartService.expire_old_carts(db)

        if expired_count > 0:
            logger.info(f"✅ Expired {expired_count} shopping carts")
        else:
            logger.debug("No carts to expire")

    except Exception as e:
        logger.error(f"Cart expiration job failed: {e}")

    finally:
        db.close()


def keep_alive_ping():
    """
    Ping backend and frontend to prevent cold starts on free tier hosting.
    Runs every 10 minutes.
    """
    logger.debug("Running keep-alive ping...")

    # URLs to ping
    urls_to_ping = []

    # Backend health endpoint (self-ping)
    backend_url = getattr(settings, 'BACKEND_URL', None)
    if backend_url:
        urls_to_ping.append(f"{backend_url}/health")

    # Frontend URL
    frontend_url = settings.FRONTEND_URL
    if frontend_url and frontend_url != "http://localhost:3000":
        urls_to_ping.append(frontend_url)

    if not urls_to_ping:
        logger.debug("No URLs configured for keep-alive ping")
        return

    for url in urls_to_ping:
        try:
            with httpx.Client(timeout=30) as client:
                response = client.get(url)
                logger.debug(f"✅ Ping {url}: {response.status_code}")
        except Exception as e:
            logger.warning(f"⚠️ Ping failed for {url}: {e}")


def start_scheduler():
    """Start background jobs scheduler"""

    # Auto-release escrow (every 6 hours)
    scheduler.add_job(
        auto_release_escrow,
        'interval',
        hours=6,
        id='auto_release_escrow',
        replace_existing=True
    )

    # Cleanup OTPs (daily at 3 AM)
    scheduler.add_job(
        cleanup_expired_otps,
        'cron',
        hour=3,
        id='cleanup_otps',
        replace_existing=True
    )

    # Expire old shopping carts (every 6 hours)
    scheduler.add_job(
        expire_old_carts,
        'interval',
        hours=6,
        id='expire_carts',
        replace_existing=True
    )

    # Keep-alive ping (every 10 minutes) to prevent cold starts
    scheduler.add_job(
        keep_alive_ping,
        'interval',
        minutes=10,
        id='keep_alive_ping',
        replace_existing=True
    )

    scheduler.start()
    logger.info("✅ Background scheduler started")


def stop_scheduler():
    """Stop scheduler"""
    scheduler.shutdown()
    logger.info("🛑 Background scheduler stopped")