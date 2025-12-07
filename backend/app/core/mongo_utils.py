from typing import Any, Dict, Iterable, List, Optional

from bson import ObjectId


def to_object_id(value: str) -> ObjectId:
    """
    Convert a string to ObjectId, raising ValueError on invalid input.
    """
    if isinstance(value, ObjectId):
        return value
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid ObjectId")
    return ObjectId(value)


def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Convert MongoDB documents to API-friendly dicts with string ids.
    """
    if doc is None:
        return None
    data = dict(doc)
    if "_id" in data:
        data["id"] = str(data.pop("_id"))
    return data


def serialize_many(docs: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [serialize_doc(doc) for doc in docs if doc is not None]
