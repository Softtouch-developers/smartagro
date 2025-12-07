"""
Knowledge Base Service
Handles document ingestion, embedding, indexing, and retrieval
Supports any document type - crop guides, general practices, FAQs, etc.
"""
import os
import re
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import text

from config import settings
from database import get_db, get_mongo_db
from models import KnowledgeEmbedding
from integrations.openrouter import get_embedding

logger = logging.getLogger(__name__)


# ==================== DOCUMENT TYPE DETECTION ====================

# Keywords for detecting document types
DOCUMENT_TYPE_PATTERNS = {
    "CROP_GUIDE": {
        "title_patterns": [r"production", r"cultivation", r"growing", r"farming"],
        "content_patterns": [r"variety", r"planting", r"harvest", r"yield"],
        "weight": 1.0
    },
    "PEST_REFERENCE": {
        "title_patterns": [r"pest", r"disease", r"insect", r"fungus"],
        "content_patterns": [r"symptoms", r"control", r"treatment", r"spray"],
        "weight": 1.0
    },
    "POST_HARVEST": {
        "title_patterns": [r"post.?harvest", r"storage", r"processing"],
        "content_patterns": [r"drying", r"storage", r"preservation", r"moisture"],
        "weight": 1.0
    },
    "SOIL_MANAGEMENT": {
        "title_patterns": [r"soil", r"nutrient", r"fertilizer", r"compost"],
        "content_patterns": [r"nitrogen", r"phosphorus", r"organic matter", r"pH"],
        "weight": 1.0
    },
    "WEATHER_CLIMATE": {
        "title_patterns": [r"weather", r"climate", r"season", r"rainfall"],
        "content_patterns": [r"temperature", r"humidity", r"rainfall", r"drought"],
        "weight": 1.0
    },
    "EQUIPMENT": {
        "title_patterns": [r"equipment", r"machinery", r"tools", r"implement"],
        "content_patterns": [r"tractor", r"sprayer", r"harvester", r"irrigation"],
        "weight": 1.0
    },
    "MARKET_INFO": {
        "title_patterns": [r"market", r"price", r"trade", r"export"],
        "content_patterns": [r"price", r"demand", r"supply", r"buyer"],
        "weight": 1.0
    },
    "GENERAL_GUIDE": {
        "title_patterns": [],
        "content_patterns": [],
        "weight": 0.5  # Default fallback
    }
}

# Common crop names to detect
CROP_NAMES = [
    "maize", "corn", "tomato", "tomatoes", "pepper", "peppers", "onion", "onions",
    "cabbage", "lettuce", "cucumber", "yam", "yams", "cassava", "plantain",
    "rice", "sorghum", "millet", "groundnut", "groundnuts", "cowpea", "cowpeas",
    "soybean", "soybeans", "cocoa", "coffee", "oil palm", "cashew", "mango",
    "orange", "pineapple", "banana", "pawpaw", "papaya", "watermelon", "garden egg",
    "okra", "spinach", "carrot", "beans", "ginger", "turmeric"
]

# Topic keywords for classification
TOPIC_KEYWORDS = {
    "planting": ["planting", "sowing", "seed", "germination", "seedling", "transplant"],
    "harvesting": ["harvest", "mature", "maturity", "picking", "reaping"],
    "pest_control": ["pest", "insect", "worm", "borer", "aphid", "mite", "caterpillar"],
    "disease_control": ["disease", "fungus", "bacteria", "virus", "blight", "rot", "wilt"],
    "fertilization": ["fertilizer", "nutrient", "manure", "compost", "nitrogen", "npk"],
    "irrigation": ["water", "irrigation", "watering", "moisture", "drought"],
    "weed_control": ["weed", "herbicide", "weeding"],
    "storage": ["storage", "store", "drying", "preservation"],
    "soil_preparation": ["soil", "land preparation", "tillage", "plough", "ridge"],
    "variety_selection": ["variety", "cultivar", "hybrid", "opv", "seed selection"]
}

# Ghana regions
GHANA_REGIONS = [
    "Greater Accra", "Ashanti", "Western", "Eastern", "Central",
    "Northern", "Upper East", "Upper West", "Volta", "Brong-Ahafo",
    "Savannah", "Bono East", "Ahafo", "Western North", "Oti", "North East"
]

# Ecological zones
ECOLOGICAL_ZONES = [
    "Forest", "Coastal Savannah", "Guinea Savannah", "Sudan Savannah",
    "Transition", "Forest-Savannah Transition", "Rainforest"
]


class KnowledgeService:
    """Service for managing agricultural knowledge base"""

    # ==================== TEXT PROCESSING ====================

    @staticmethod
    def clean_text(text: str) -> str:
        """Clean and normalize text"""
        # Remove excessive whitespace
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)
        text = re.sub(r'\t+', ' ', text)

        # Remove markdown artifacts that don't add meaning
        text = re.sub(r'^�+', '', text, flags=re.MULTILINE)
        text = re.sub(r'^\d+�', '', text, flags=re.MULTILINE)

        return text.strip()

    @staticmethod
    def extract_title(content: str, filename: str) -> str:
        """Extract document title from content or filename"""
        # Try to find markdown heading
        heading_match = re.search(r'^#\s+(.+?)$', content, re.MULTILINE)
        if heading_match:
            return heading_match.group(1).strip()

        # Try to find bold title
        bold_match = re.search(r'^\*\*(.+?)\*\*', content, re.MULTILINE)
        if bold_match:
            return bold_match.group(1).strip()

        # Fall back to filename
        title = filename.replace(".md", "").replace("_", " ").replace("-", " ")
        return title.title()

    @staticmethod
    def extract_sections(content: str) -> List[Dict[str, Any]]:
        """Extract sections from markdown content"""
        sections = []

        # Split by headings (# ## ### or numbered sections like 1.0, 2.0)
        section_pattern = r'(?:^#{1,3}\s+.+$|^\d+\.\d*\s+.+$|^\*\*\d+\.\d*\s+.+\*\*$)'
        parts = re.split(section_pattern, content, flags=re.MULTILINE)
        headings = re.findall(section_pattern, content, flags=re.MULTILINE)

        # First part before any heading
        if parts and parts[0].strip():
            sections.append({
                "title": "Introduction",
                "content": parts[0].strip()
            })

        # Pair headings with content
        for i, heading in enumerate(headings):
            content_idx = i + 1
            if content_idx < len(parts):
                # Clean heading
                clean_heading = re.sub(r'^[#\*\d\.\s]+', '', heading).strip()
                clean_heading = clean_heading.rstrip('*').strip()

                sections.append({
                    "title": clean_heading,
                    "content": parts[content_idx].strip()
                })

        return sections

    @staticmethod
    def chunk_text(
        text: str,
        section_title: Optional[str] = None,
        chunk_size: int = None,
        overlap: int = None
    ) -> List[Dict[str, Any]]:
        """
        Split text into overlapping chunks for better retrieval

        Args:
            text: Text to chunk
            section_title: Optional section heading
            chunk_size: Max characters per chunk
            overlap: Characters to overlap between chunks

        Returns:
            List of chunk dicts
        """
        chunk_size = chunk_size or settings.CHUNK_SIZE
        overlap = overlap or settings.CHUNK_OVERLAP

        text = KnowledgeService.clean_text(text)

        if len(text) <= chunk_size:
            return [{
                "text": text,
                "section_title": section_title,
                "chunk_index": 0,
                "char_start": 0,
                "char_end": len(text)
            }]

        chunks = []
        start = 0
        chunk_index = 0

        while start < len(text):
            end = start + chunk_size

            # Try to end at sentence boundary
            if end < len(text):
                # Look for sentence end within last 150 chars
                for i in range(min(150, end - start)):
                    if text[end - i] in '.!?\n':
                        end = end - i + 1
                        break

            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append({
                    "text": chunk_text,
                    "section_title": section_title,
                    "chunk_index": chunk_index,
                    "char_start": start,
                    "char_end": end
                })
                chunk_index += 1

            # Move start with overlap
            start = end - overlap if end < len(text) else len(text)

        return chunks

    # ==================== CLASSIFICATION ====================

    @staticmethod
    def detect_document_type(title: str, content: str) -> str:
        """Detect document type based on title and content"""
        title_lower = title.lower()
        content_lower = content.lower()[:5000]  # Check first 5000 chars

        scores = {}

        for doc_type, patterns in DOCUMENT_TYPE_PATTERNS.items():
            score = 0

            # Check title patterns
            for pattern in patterns["title_patterns"]:
                if re.search(pattern, title_lower):
                    score += 3  # Title matches are weighted higher

            # Check content patterns
            for pattern in patterns["content_patterns"]:
                matches = len(re.findall(pattern, content_lower))
                score += min(matches, 5)  # Cap at 5 matches per pattern

            scores[doc_type] = score * patterns["weight"]

        # Return type with highest score, or GENERAL_GUIDE if no matches
        best_type = max(scores, key=scores.get)
        if scores[best_type] > 0:
            return best_type
        return "GENERAL_GUIDE"

    @staticmethod
    def detect_crops(content: str) -> List[str]:
        """Detect crop names mentioned in content"""
        content_lower = content.lower()
        detected = []

        for crop in CROP_NAMES:
            if crop in content_lower:
                # Normalize crop name
                normalized = crop.replace("s", "").title() if crop.endswith("s") else crop.title()
                if normalized not in detected:
                    detected.append(normalized)

        return detected

    @staticmethod
    def detect_topics(content: str) -> List[str]:
        """Detect topics covered in content"""
        content_lower = content.lower()
        detected = []

        for topic, keywords in TOPIC_KEYWORDS.items():
            for keyword in keywords:
                if keyword in content_lower:
                    if topic not in detected:
                        detected.append(topic)
                    break

        return detected

    @staticmethod
    def detect_regions(content: str) -> List[str]:
        """Detect Ghana regions mentioned in content"""
        content_lower = content.lower()
        detected = []

        for region in GHANA_REGIONS + ECOLOGICAL_ZONES:
            if region.lower() in content_lower:
                if region not in detected:
                    detected.append(region)

        return detected

    @staticmethod
    def extract_keywords(content: str, max_keywords: int = 20) -> List[str]:
        """Extract important keywords from content"""
        # Simple keyword extraction based on frequency and importance
        words = re.findall(r'\b[a-zA-Z]{4,}\b', content.lower())

        # Common words to exclude
        stop_words = {
            "that", "this", "with", "from", "have", "been", "were", "will",
            "when", "which", "their", "there", "about", "would", "should",
            "could", "these", "those", "than", "then", "also", "into", "some",
            "such", "other", "more", "very", "most", "only", "just", "over"
        }

        # Count word frequencies
        word_counts = {}
        for word in words:
            if word not in stop_words and len(word) > 3:
                word_counts[word] = word_counts.get(word, 0) + 1

        # Sort by frequency and take top keywords
        sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
        return [word for word, count in sorted_words[:max_keywords]]

    # ==================== DOCUMENT INGESTION ====================

    @staticmethod
    def delete_document(document_id: str, db: Session) -> bool:
        """
        Delete a document from both MongoDB and PostgreSQL

        Args:
            document_id: Document ID to delete
            db: Database session

        Returns:
            True if deleted, False if not found
        """
        try:
            mongo_db = get_mongo_db()

            # Delete from MongoDB
            result = mongo_db['knowledge_documents'].delete_one({"document_id": document_id})

            # Delete embeddings from PostgreSQL
            db.query(KnowledgeEmbedding).filter(
                KnowledgeEmbedding.document_id == document_id
            ).delete()
            db.commit()

            logger.info(f"Deleted document: {document_id}")
            return result.deleted_count > 0

        except Exception as e:
            logger.error(f"Failed to delete document {document_id}: {e}")
            db.rollback()
            return False

    @staticmethod
    def process_document(
        filepath: str,
        db: Session,
        upload_to_spaces: bool = False,
        force_reindex: bool = False
    ) -> Dict[str, Any]:
        """
        Process a document file and store in MongoDB + PostgreSQL

        Args:
            filepath: Path to document file
            db: Database session
            upload_to_spaces: Whether to upload original file to DO Spaces
            force_reindex: If True, delete existing and re-process

        Returns:
            Processing result dict
        """
        try:
            mongo_db = get_mongo_db()
            knowledge_docs = mongo_db['knowledge_documents']

            # Read file
            with open(filepath, 'r', encoding='utf-8') as f:
                raw_content = f.read()

            filename = os.path.basename(filepath)
            file_size = os.path.getsize(filepath)

            # Check if already processed
            existing = knowledge_docs.find_one({"source_file": filename})
            if existing:
                if force_reindex:
                    # Delete existing document and re-process
                    logger.info(f"Force re-indexing {filename}, deleting existing...")
                    KnowledgeService.delete_document(existing["document_id"], db)
                else:
                    logger.info(f"Document {filename} already exists, skipping")
                    return {
                        "status": "skipped",
                        "document_id": existing["document_id"],
                        "message": "Document already exists"
                    }

            # Generate document ID
            document_id = f"doc_{uuid.uuid4().hex[:12]}"

            # Extract metadata
            title = KnowledgeService.extract_title(raw_content, filename)
            document_type = KnowledgeService.detect_document_type(title, raw_content)
            crops = KnowledgeService.detect_crops(raw_content)
            topics = KnowledgeService.detect_topics(raw_content)
            regions = KnowledgeService.detect_regions(raw_content)
            keywords = KnowledgeService.extract_keywords(raw_content)

            # Clean content
            cleaned_content = KnowledgeService.clean_text(raw_content)

            # Extract sections and create chunks
            sections = KnowledgeService.extract_sections(cleaned_content)
            all_chunks = []
            chunk_counter = 0

            for section in sections:
                section_chunks = KnowledgeService.chunk_text(
                    section["content"],
                    section_title=section["title"]
                )

                for chunk in section_chunks:
                    chunk["chunk_id"] = f"{document_id}_chunk_{chunk_counter:04d}"
                    chunk["topics"] = KnowledgeService.detect_topics(chunk["text"])
                    chunk_counter += 1
                    all_chunks.append(chunk)

            # If no sections found, chunk the whole document
            if not all_chunks:
                all_chunks = KnowledgeService.chunk_text(cleaned_content)
                for i, chunk in enumerate(all_chunks):
                    chunk["chunk_id"] = f"{document_id}_chunk_{i:04d}"
                    chunk["topics"] = KnowledgeService.detect_topics(chunk["text"])

            # Upload to DO Spaces if enabled
            source_url = None
            if upload_to_spaces:
                # TODO: Implement DO Spaces upload
                pass

            # Determine categories based on topics
            categories = []
            topic_to_category = {
                "planting": "PLANTING",
                "harvesting": "HARVESTING",
                "pest_control": "PEST_CONTROL",
                "disease_control": "DISEASE_CONTROL",
                "fertilization": "FERTILIZATION",
                "storage": "STORAGE",
                "soil_preparation": "SOIL_PREPARATION"
            }
            for topic in topics:
                if topic in topic_to_category:
                    cat = topic_to_category[topic]
                    if cat not in categories:
                        categories.append(cat)

            # Create MongoDB document
            mongo_doc = {
                "document_id": document_id,
                "title": title,
                "description": cleaned_content[:500] + "..." if len(cleaned_content) > 500 else cleaned_content,
                "document_type": document_type,
                "topics": topics,
                "crops": crops,
                "categories": categories,
                "source_file": filename,
                "source_url": source_url,
                "file_type": "markdown",
                "file_size_bytes": file_size,
                "raw_content": raw_content,
                "processed_content": cleaned_content,
                "chunks": [
                    {
                        "chunk_id": c["chunk_id"],
                        "chunk_index": c["chunk_index"],
                        "text": c["text"],
                        "section_title": c.get("section_title"),
                        "topics": c.get("topics", []),
                        "char_start": c["char_start"],
                        "char_end": c["char_end"]
                    }
                    for c in all_chunks
                ],
                "total_chunks": len(all_chunks),
                "search_keywords": keywords,
                "search_text": " ".join(keywords + topics + crops),
                "metadata": {
                    "language": "en",
                    "regions": regions,
                    "version": "1.0"
                },
                "status": "PROCESSING",
                "is_indexed": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }

            # Insert into MongoDB
            knowledge_docs.insert_one(mongo_doc)
            logger.info(f"Created MongoDB document: {document_id}")

            # Generate embeddings and store in PostgreSQL
            embeddings_created = 0
            for chunk in all_chunks:
                try:
                    # Generate embedding
                    embedding = get_embedding(chunk["text"])
                    embedding_str = f"[{','.join(map(str, embedding))}]"

                    # Create PostgreSQL record
                    embedding_record = KnowledgeEmbedding(
                        document_id=document_id,
                        chunk_id=chunk["chunk_id"],
                        chunk_text=chunk["text"],
                        chunk_index=chunk["chunk_index"],
                        embedding=embedding_str,
                        document_type=document_type,
                        topics=chunk.get("topics", []),
                        crops=crops,
                        section_title=chunk.get("section_title"),
                        search_text=chunk["text"][:1000]
                    )

                    db.add(embedding_record)
                    embeddings_created += 1

                except Exception as e:
                    logger.warning(f"Failed to create embedding for chunk {chunk['chunk_id']}: {e}")

            db.commit()

            # Update MongoDB document status
            knowledge_docs.update_one(
                {"document_id": document_id},
                {
                    "$set": {
                        "status": "ACTIVE",
                        "is_indexed": True,
                        "indexed_at": datetime.utcnow()
                    }
                }
            )

            logger.info(f"Processed {filename}: {len(all_chunks)} chunks, {embeddings_created} embeddings")

            return {
                "status": "success",
                "document_id": document_id,
                "title": title,
                "document_type": document_type,
                "chunks_created": len(all_chunks),
                "embeddings_created": embeddings_created,
                "topics": topics,
                "crops": crops
            }

        except Exception as e:
            logger.error(f"Error processing {filepath}: {e}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }

    @staticmethod
    def index_knowledge_base(db: Session = None, force_reindex: bool = False) -> Dict[str, Any]:
        """
        Index all documents in the knowledge base directory

        Args:
            db: Optional database session
            force_reindex: If True, re-process all documents even if they exist

        Returns:
            Processing statistics
        """
        if db is None:
            db = next(get_db())

        kb_path = Path(settings.KNOWLEDGEBASE_PATH)
        if not kb_path.exists():
            logger.error(f"Knowledge base path not found: {kb_path}")
            return {"error": "Path not found", "path": str(kb_path)}

        stats = {
            "files_found": 0,
            "files_processed": 0,
            "files_skipped": 0,
            "files_reindexed": 0,
            "files_errored": 0,
            "total_chunks": 0,
            "total_embeddings": 0,
            "force_reindex": force_reindex,
            "documents": []
        }

        # Find all markdown files
        md_files = list(kb_path.glob("*.md"))
        stats["files_found"] = len(md_files)

        logger.info(f"Found {len(md_files)} markdown files to process (force_reindex={force_reindex})")

        for md_file in md_files:
            result = KnowledgeService.process_document(str(md_file), db, force_reindex=force_reindex)

            if result["status"] == "success":
                stats["files_processed"] += 1
                stats["total_chunks"] += result.get("chunks_created", 0)
                stats["total_embeddings"] += result.get("embeddings_created", 0)
                stats["documents"].append({
                    "file": md_file.name,
                    "document_id": result["document_id"],
                    "title": result["title"],
                    "type": result["document_type"]
                })
            elif result["status"] == "skipped":
                stats["files_skipped"] += 1
            else:
                stats["files_errored"] += 1
                logger.error(f"Failed to process {md_file.name}: {result.get('error')}")

        logger.info(f"Indexing complete: {stats['files_processed']} processed, "
                   f"{stats['files_skipped']} skipped, {stats['files_errored']} errors")

        return stats

    # ==================== SEARCH ====================

    @staticmethod
    def hybrid_search(
        query: str,
        db: Session,
        document_type: Optional[str] = None,
        crops: Optional[List[str]] = None,
        topics: Optional[List[str]] = None,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search combining semantic and keyword search

        Args:
            query: Search query
            db: Database session
            document_type: Optional filter by document type
            crops: Optional filter by crops
            topics: Optional filter by topics
            limit: Max results

        Returns:
            List of ranked search results
        """
        try:
            # Generate query embedding
            query_embedding = get_embedding(query)
            embedding_str = f"[{','.join(map(str, query_embedding))}]"

            # Build filter conditions
            filters = []
            params = {
                "embedding": embedding_str,
                "query": query,
                "limit": limit
            }

            if document_type:
                filters.append("document_type = :doc_type")
                params["doc_type"] = document_type

            if crops:
                filters.append("crops && :crops")
                params["crops"] = crops

            if topics:
                filters.append("topics && :topics")
                params["topics"] = topics

            where_clause = " AND ".join(filters) if filters else "1=1"

            # Hybrid search SQL
            sql = text(f"""
                WITH semantic_search AS (
                    SELECT
                        id,
                        document_id,
                        chunk_id,
                        chunk_text,
                        chunk_index,
                        document_type,
                        topics,
                        crops,
                        section_title,
                        1 - (embedding::vector <=> :embedding::vector) AS semantic_score
                    FROM knowledge_embeddings
                    WHERE embedding IS NOT NULL
                    AND {where_clause}
                    ORDER BY embedding::vector <=> :embedding::vector
                    LIMIT :limit * 2
                ),
                keyword_search AS (
                    SELECT
                        id,
                        document_id,
                        chunk_id,
                        chunk_text,
                        chunk_index,
                        document_type,
                        topics,
                        crops,
                        section_title,
                        ts_rank(
                            to_tsvector('english', search_text),
                            plainto_tsquery('english', :query)
                        ) AS keyword_score
                    FROM knowledge_embeddings
                    WHERE to_tsvector('english', search_text) @@ plainto_tsquery('english', :query)
                    AND {where_clause}
                    LIMIT :limit * 2
                )
                SELECT DISTINCT ON (COALESCE(s.chunk_id, k.chunk_id))
                    COALESCE(s.id, k.id) AS id,
                    COALESCE(s.document_id, k.document_id) AS document_id,
                    COALESCE(s.chunk_id, k.chunk_id) AS chunk_id,
                    COALESCE(s.chunk_text, k.chunk_text) AS chunk_text,
                    COALESCE(s.chunk_index, k.chunk_index) AS chunk_index,
                    COALESCE(s.document_type, k.document_type) AS document_type,
                    COALESCE(s.topics, k.topics) AS topics,
                    COALESCE(s.crops, k.crops) AS crops,
                    COALESCE(s.section_title, k.section_title) AS section_title,
                    COALESCE(s.semantic_score, 0) AS semantic_score,
                    COALESCE(k.keyword_score, 0) AS keyword_score,
                    (COALESCE(s.semantic_score, 0) * 0.7 + COALESCE(k.keyword_score, 0) * 0.3) AS combined_score
                FROM semantic_search s
                FULL OUTER JOIN keyword_search k ON s.chunk_id = k.chunk_id
                ORDER BY COALESCE(s.chunk_id, k.chunk_id), combined_score DESC
            """)

            results = db.execute(sql, params).fetchall()

            # Sort by combined score and limit
            results = sorted(results, key=lambda r: r.combined_score, reverse=True)[:limit]

            return [
                {
                    "id": r.id,
                    "document_id": r.document_id,
                    "chunk_id": r.chunk_id,
                    "content": r.chunk_text,
                    "chunk_index": r.chunk_index,
                    "document_type": r.document_type,
                    "topics": r.topics or [],
                    "crops": r.crops or [],
                    "section_title": r.section_title,
                    "semantic_score": float(r.semantic_score) if r.semantic_score else 0,
                    "keyword_score": float(r.keyword_score) if r.keyword_score else 0,
                    "combined_score": float(r.combined_score) if r.combined_score else 0
                }
                for r in results
            ]

        except Exception as e:
            logger.error(f"Hybrid search failed: {e}", exc_info=True)
            # Fallback to simple keyword search
            return KnowledgeService.keyword_search(query, db, limit)

    @staticmethod
    def keyword_search(
        query: str,
        db: Session,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Fallback keyword search"""
        try:
            sql = text("""
                SELECT
                    id, document_id, chunk_id, chunk_text,
                    chunk_index, document_type, topics, crops, section_title
                FROM knowledge_embeddings
                WHERE LOWER(chunk_text) LIKE LOWER(:pattern)
                OR LOWER(search_text) LIKE LOWER(:pattern)
                LIMIT :limit
            """)

            results = db.execute(sql, {
                "pattern": f"%{query}%",
                "limit": limit
            }).fetchall()

            return [
                {
                    "id": r.id,
                    "document_id": r.document_id,
                    "chunk_id": r.chunk_id,
                    "content": r.chunk_text,
                    "chunk_index": r.chunk_index,
                    "document_type": r.document_type,
                    "topics": r.topics or [],
                    "crops": r.crops or [],
                    "section_title": r.section_title,
                    "semantic_score": 0,
                    "keyword_score": 1,
                    "combined_score": 0.3
                }
                for r in results
            ]

        except Exception as e:
            logger.error(f"Keyword search failed: {e}")
            return []

    @staticmethod
    def get_document_by_id(document_id: str) -> Optional[Dict[str, Any]]:
        """Get full document from MongoDB by ID"""
        try:
            mongo_db = get_mongo_db()
            doc = mongo_db['knowledge_documents'].find_one({"document_id": document_id})

            if doc:
                # Convert ObjectId to string
                doc["_id"] = str(doc["_id"])
                return doc

            return None

        except Exception as e:
            logger.error(f"Get document failed: {e}")
            return None

    @staticmethod
    def get_all_documents(
        document_type: Optional[str] = None,
        status: str = "ACTIVE",
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get all documents from MongoDB"""
        try:
            mongo_db = get_mongo_db()

            query = {"status": status}
            if document_type:
                query["document_type"] = document_type

            docs = mongo_db['knowledge_documents'].find(
                query,
                {
                    "_id": 0,
                    "document_id": 1,
                    "title": 1,
                    "document_type": 1,
                    "topics": 1,
                    "crops": 1,
                    "total_chunks": 1,
                    "created_at": 1
                }
            ).limit(limit)

            return list(docs)

        except Exception as e:
            logger.error(f"Get all documents failed: {e}")
            return []
