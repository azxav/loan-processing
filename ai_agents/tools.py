from typing import Dict, Any, List
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
import re

class AgentTools:
    """
    Comprehensive tool suite for AI agents in loan processing orchestration.
    All tools return JSON-structured data for easy parsing by LLM agents.
    """
    
    # ========================================================================
    # DOCUMENT VERIFICATION TOOLS
    # ========================================================================
    
    @staticmethod
    def check_document_completeness(
        id_doc: Dict[str, Any],
        loan_app: Dict[str, Any],
        payslip: Dict[str, Any],
        bank_stmt: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Check if all required documents are present and have required fields"""
        required_fields = {
            "id_document": ["id_number", "full_name", "date_of_birth", "date_of_expiry"],
            "loan_application": ["application_id", "applicant", "employment_details"],
            "payslip": ["employee", "employer", "earnings", "net_pay"],
            "bank_statement": ["account", "transactions"]
        }
        
        missing_fields = {
            "id_document": [],
            "loan_application": [],
            "payslip": [],
            "bank_statement": []
        }
        
        # Check ID document
        for field in required_fields["id_document"]:
            if field not in id_doc or not id_doc[field]:
                missing_fields["id_document"].append(field)
        
        # Check loan application
        for field in required_fields["loan_application"]:
            if field not in loan_app or not loan_app[field]:
                missing_fields["loan_application"].append(field)
        
        # Check payslip
        for field in required_fields["payslip"]:
            if field not in payslip or not payslip[field]:
                missing_fields["payslip"].append(field)
        
        # Check bank statement
        for field in required_fields["bank_statement"]:
            if field not in bank_stmt or not bank_stmt[field]:
                missing_fields["bank_statement"].append(field)
        
        total_missing = sum(len(v) for v in missing_fields.values())
        
        return {
            "complete": total_missing == 0,
            "missing_fields": missing_fields,
            "completeness_score": 1.0 - (total_missing / 14.0)  # 14 total required fields
        }
    
    @staticmethod
    def validate_cross_document_consistency(
        id_doc: Dict[str, Any],
        loan_app: Dict[str, Any],
        payslip: Dict[str, Any],
        bank_stmt: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate that key information is consistent across all documents"""
        issues = []
        
        # Extract names from all documents
        id_name = id_doc.get("full_name", "").strip().lower()
        app_name = loan_app.get("applicant", {}).get("full_name", "").strip().lower()
        payslip_name = payslip.get("employee", {}).get("full_name", "").strip().lower()
        bank_name = bank_stmt.get("account", {}).get("account_holder_name", "").strip().lower()
        
        # Check name consistency
        names = [id_name, app_name, payslip_name, bank_name]
        unique_names = set([n for n in names if n])
        
        if len(unique_names) > 1:
            issues.append({
                "field": "full_name",
                "issue": "Name mismatch across documents",
                "values": {
                    "id_document": id_name,
                    "loan_application": app_name,
                    "payslip": payslip_name,
                    "bank_statement": bank_name
                }
            })
        
        # Check ID number consistency
        id_number = id_doc.get("id_number", "")
        app_id_number = loan_app.get("applicant", {}).get("national_id_number", "")
        payslip_id_number = payslip.get("employee", {}).get("national_id_number", "")
        
        if id_number and app_id_number and id_number != app_id_number:
            issues.append({
                "field": "national_id_number",
                "issue": "ID number mismatch between ID document and application",
                "values": {"id_document": id_number, "loan_application": app_id_number}
            })
        
        if id_number and payslip_id_number and id_number != payslip_id_number:
            issues.append({
                "field": "national_id_number",
                "issue": "ID number mismatch between ID document and payslip",
                "values": {"id_document": id_number, "payslip": payslip_id_number}
            })
        
        # Check employer consistency
        app_employer = loan_app.get("employment_details", {}).get("employer_name", "").strip().lower()
        payslip_employer = payslip.get("employer", {}).get("name", "").strip().lower()
        
        if app_employer and payslip_employer and app_employer != payslip_employer:
            issues.append({
                "field": "employer_name",
                "issue": "Employer name mismatch between application and payslip",
                "values": {"loan_application": app_employer, "payslip": payslip_employer}
            })
        
        return {
            "consistent": len(issues) == 0,
            "issues": issues,
            "name_consistency": len(unique_names) <= 1,
            "id_consistency": id_number == app_id_number == payslip_id_number if all([id_number, app_id_number, payslip_id_number]) else False,
            "employer_consistency": app_employer == payslip_employer if all([app_employer, payslip_employer]) else False
        }
    
    @staticmethod
    def detect_fraud_patterns(
        id_doc: Dict[str, Any],
        bank_stmt: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect potential fraud indicators in documents"""
        fraud_indicators = []
        risk_score = 0.0
        
        # Check if ID is expired
        expiry_date_str = id_doc.get("date_of_expiry")
        if expiry_date_str:
            try:
                expiry_date = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
                if expiry_date < date.today():
                    fraud_indicators.append("ID document has expired")
                    risk_score += 30.0
            except:
                pass
        
        # Check for high-risk transactions in bank statement
        transactions = bank_stmt.get("transactions", [])
        gambling_count = 0
        overdraft_count = 0
        
        for txn in transactions:
            category = txn.get("category", "")
            if "GAMBLING" in category or "CASINO" in category:
                gambling_count += 1
                risk_score += 5.0
            if "OVERDRAFT" in category:
                overdraft_count += 1
                risk_score += 3.0
        
        if gambling_count > 0:
            fraud_indicators.append(f"Found {gambling_count} gambling transactions")
        
        if overdraft_count > 0:
            fraud_indicators.append(f"Found {overdraft_count} overdraft fees (poor financial management)")
        
        # Check OCR confidence scores
        id_confidence = id_doc.get("raw_ocr_confidence", 1.0)
        if id_confidence < 0.85:
            fraud_indicators.append(f"Low OCR confidence on ID document ({id_confidence:.2%})")
            risk_score += 15.0
        
        return {
            "fraud_indicators": fraud_indicators,
            "risk_score": min(risk_score, 100.0),
            "gambling_transactions": gambling_count,
            "overdraft_incidents": overdraft_count,
            "id_expired": expiry_date < date.today() if expiry_date_str else False
        }
    
    # ========================================================================
    # INCOME ANALYSIS TOOLS
    # ========================================================================
    
    @staticmethod
    def calculate_average_income(bank_stmt: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate average monthly income from bank statement transactions"""
        transactions = bank_stmt.get("transactions", [])
        
        # Find all salary deposits
        salary_deposits = []
        for txn in transactions:
            category = txn.get("category", "")
            if category == "INCOME_SALARY" and txn.get("direction") == "CREDIT":
                salary_deposits.append({
                    "date": txn.get("date"),
                    "amount": txn.get("amount", 0.0),
                    "description": txn.get("description", "")
                })
        
        if not salary_deposits:
            return {
                "average_monthly_income": 0.0,
                "salary_deposits": [],
                "deposit_count": 0,
                "income_months_covered": 0
            }
        
        # Calculate average
        total_income = sum(d["amount"] for d in salary_deposits)
        avg_income = total_income / len(salary_deposits) if salary_deposits else 0.0
        
        # Determine months covered
        if salary_deposits:
            dates = [datetime.strptime(d["date"], "%Y-%m-%d") for d in salary_deposits]
            months_covered = len(set((d.year, d.month) for d in dates))
        else:
            months_covered = 0
        
        return {
            "average_monthly_income": avg_income,
            "salary_deposits": salary_deposits,
            "deposit_count": len(salary_deposits),
            "income_months_covered": months_covered,
            "total_income": total_income
        }
    
    @staticmethod
    def analyze_income_stability(bank_stmt: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze stability and regularity of income"""
        transactions = bank_stmt.get("transactions", [])
        
        # Get salary deposits
        salary_amounts = []
        for txn in transactions:
            if txn.get("category") == "INCOME_SALARY" and txn.get("direction") == "CREDIT":
                salary_amounts.append(txn.get("amount", 0.0))
        
        if len(salary_amounts) < 2:
            return {
                "stability_score": 0.0,
                "regular_income": False,
                "income_variance": 0.0,
                "consistent_amount": False
            }
        
        # Calculate variance
        avg = sum(salary_amounts) / len(salary_amounts)
        variance = sum((x - avg) ** 2 for x in salary_amounts) / len(salary_amounts)
        std_dev = variance ** 0.5
        coefficient_of_variation = (std_dev / avg) if avg > 0 else 1.0
        
        # Score based on consistency (lower CV = higher stability)
        stability_score = max(0.0, 1.0 - coefficient_of_variation)
        
        # Check if amounts are consistent (within 10% variance)
        consistent_amount = coefficient_of_variation < 0.10
        
        return {
            "stability_score": stability_score,
            "regular_income": len(salary_amounts) >= 2,
            "income_variance": coefficient_of_variation,
            "consistent_amount": consistent_amount,
            "sample_size": len(salary_amounts)
        }
    
    @staticmethod
    def flag_unusual_transactions(bank_stmt: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Flag unusual or suspicious transactions"""
        transactions = bank_stmt.get("transactions", [])
        unusual = []
        
        risk_categories = [
            "HIGH_RISK_GAMBLING",
            "FEE_OVERDRAFT",
            "FEE_NSF",
            "FEE_LATE_PAYMENT"
        ]
        
        for txn in transactions:
            category = txn.get("category", "")
            
            # Flag high-risk categories
            if category in risk_categories:
                unusual.append({
                    "transaction_id": txn.get("transaction_id"),
                    "date": txn.get("date"),
                    "description": txn.get("description"),
                    "category": category,
                    "amount": txn.get("amount"),
                    "reason": f"High-risk category: {category}"
                })
            
            # Flag large withdrawals (over $2000)
            if txn.get("direction") == "DEBIT" and abs(txn.get("amount", 0)) > 2000:
                unusual.append({
                    "transaction_id": txn.get("transaction_id"),
                    "date": txn.get("date"),
                    "description": txn.get("description"),
                    "amount": txn.get("amount"),
                    "reason": "Large withdrawal (>$2000)"
                })
        
        return unusual
    
    # ========================================================================
    # DEBT ASSESSMENT TOOLS
    # ========================================================================
    
    @staticmethod
    def calculate_dti(monthly_income: float, total_debt: float) -> float:
        """Calculate debt-to-income ratio"""
        if monthly_income == 0:
            return 1.0
        return total_debt / monthly_income
    
    @staticmethod
    def extract_debt_obligations(
        bank_stmt: Dict[str, Any],
        loan_app: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract and calculate monthly debt obligations"""
        transactions = bank_stmt.get("transactions", [])
        
        # Find debt payment transactions
        debt_payments = []
        for txn in transactions:
            category = txn.get("category", "")
            if "DEBT_" in category or "LOAN" in category:
                debt_payments.append({
                    "date": txn.get("date"),
                    "description": txn.get("description"),
                    "category": category,
                    "amount": abs(txn.get("amount", 0.0))
                })
        
        # Calculate monthly average from observed payments
        if debt_payments:
            # Get unique months
            dates = [datetime.strptime(d["date"], "%Y-%m-%d") for d in debt_payments]
            months = set((d.year, d.month) for d in dates)
            total_debt_paid = sum(d["amount"] for d in debt_payments)
            observed_monthly_debt = total_debt_paid / len(months) if months else total_debt_paid
        else:
            observed_monthly_debt = 0.0
        
        # Get declared debt from application
        declared_debt = loan_app.get("financial_profile", {}).get("other_monthly_debt_payments", 0.0)
        
        # Get existing loans from application
        existing_loans = loan_app.get("financial_profile", {}).get("existing_loan_accounts", [])
        declared_loan_payments = sum(loan.get("monthly_payment", 0.0) for loan in existing_loans)
        
        total_declared = declared_debt + declared_loan_payments
        
        return {
            "observed_monthly_debt": observed_monthly_debt,
            "declared_monthly_debt": total_declared,
            "debt_payment_transactions": debt_payments,
            "existing_loans": existing_loans,
            "discrepancy": abs(observed_monthly_debt - total_declared),
            "discrepancy_percentage": abs(observed_monthly_debt - total_declared) / total_declared if total_declared > 0 else 0.0
        }
    
    # ========================================================================
    # COMPLIANCE TOOLS
    # ========================================================================
    
    @staticmethod
    def verify_age_requirements(id_doc: Dict[str, Any]) -> Dict[str, Any]:
        """Verify applicant age is within acceptable range (21-65)"""
        dob_str = id_doc.get("date_of_birth")
        
        if not dob_str:
            return {
                "age_verified": False,
                "age": None,
                "reason": "Date of birth not found"
            }
        
        try:
            dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
            today = date.today()
            age = relativedelta(today, dob).years
            
            age_verified = 21 <= age <= 65
            
            return {
                "age_verified": age_verified,
                "age": age,
                "reason": "Age within acceptable range" if age_verified else f"Age {age} outside 21-65 range"
            }
        except Exception as e:
            return {
                "age_verified": False,
                "age": None,
                "reason": f"Error parsing date: {str(e)}"
            }
    
    @staticmethod
    def check_sanctions_watchlist(applicant_name: str) -> Dict[str, Any]:
        """Check if applicant is on sanctions watchlist (mock for MVP)"""
        # Mock implementation - in production, integrate with OFAC/sanctions APIs
        watchlist = [
            "john doe fraudster",
            "jane smith criminal",
            "test fraud user"
        ]
        
        name_lower = applicant_name.strip().lower()
        on_watchlist = name_lower in watchlist
        
        return {
            "sanctions_clear": not on_watchlist,
            "on_watchlist": on_watchlist,
            "checked_name": applicant_name
        }
    
    @staticmethod
    def validate_employment_status(
        loan_app: Dict[str, Any],
        payslip: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate employment status from application matches payslip"""
        app_employer = loan_app.get("employment_details", {}).get("employer_name", "").strip()
        payslip_employer = payslip.get("employer", {}).get("name", "").strip()
        
        app_status = loan_app.get("employment_details", {}).get("status", "")
        
        employer_match = app_employer.lower() == payslip_employer.lower()
        
        # Check if employment is full-time/part-time
        is_employed = "EMPLOYED" in app_status.upper()
        
        return {
            "employment_verified": employer_match and is_employed,
            "employer_match": employer_match,
            "is_employed": is_employed,
            "application_employer": app_employer,
            "payslip_employer": payslip_employer,
            "employment_status": app_status
        }

