from abc import ABC, abstractmethod
from typing import Dict, Any

class DocumentProcessor(ABC):
    @abstractmethod
    async def process_document(self, file_path: str, document_type: str) -> Dict[str, Any]:
        pass

class GoogleDocumentAIProcessor(DocumentProcessor):
    async def process_document(self, file_path: str, document_type: str) -> Dict[str, Any]:
        # Placeholder for Google Document AI implementation
        return {"text": "Sample extracted text", "confidence": 0.95}

class OCRService:
    def __init__(self):
        self.processor = GoogleDocumentAIProcessor()

    async def process(self, file_path: str, document_type: str) -> Dict[str, Any]:
        return await self.processor.process_document(file_path, document_type)

ocr_service = OCRService()
