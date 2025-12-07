from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from backend.app.core.database import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/loan-requests")
def loan_requests(
    from_dt: str | None = None, to_dt: str | None = None, db: Database = Depends(get_db)
):
    """
    Return counts and trend of loan applications in a date window.
    """
    now = datetime.utcnow()
    try:
        start = datetime.fromisoformat(from_dt) if from_dt else now - timedelta(days=30)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid from date")
    try:
        end = datetime.fromisoformat(to_dt) if to_dt else now
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid to date")
    if end < start:
        end = start

    date_match = {"created_at": {"$gte": start, "$lte": end}}
    total = db.loan_applications.count_documents(date_match)

    status_rows = db.loan_applications.aggregate(
        [
            {"$match": date_match},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        ]
    )
    status_counts = {str(row["_id"]): row["count"] for row in status_rows}

    trend_rows = db.loan_applications.aggregate(
        [
            {"$match": date_match},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"_id": 1}},
        ]
    )
    trend = [{"day": row["_id"], "count": row["count"]} for row in trend_rows]

    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "total": total,
        "status_counts": status_counts,
        "trend": trend,
    }
