from typing import Dict, Any

class AgentTools:
    @staticmethod
    def calculate_dti(monthly_income: float, total_debt: float) -> float:
        if monthly_income == 0:
            return 1.0
        return total_debt / monthly_income

    @staticmethod
    def check_blacklist(name: str) -> bool:
        # Mock blacklist check
        blacklist = ["John Doe Fraudster"]
        return name in blacklist
