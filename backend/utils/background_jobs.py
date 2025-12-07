"""
Background jobs using APScheduler
"""
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from database import SessionLocal
from models import EscrowTransaction, EscrowStatus, OTPVerification
import logging

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
    
    scheduler.start()
    logger.info("✅ Background scheduler started")


def stop_scheduler():
    """Stop scheduler"""
    scheduler.shutdown()
    logger.info("🛑 Background scheduler stopped")