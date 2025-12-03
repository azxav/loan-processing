"""
Manual test script to demonstrate the AI Agent Orchestrator with sample input data.
This script loads the real JSON files from the input/ folder and processes them.
"""

import asyncio
import json
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from ai_agents.orchestrator import orchestrator


async def load_sample_data():
    """Load sample JSON files from input folder"""
    input_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'input')
    
    # Load all required documents
    with open(os.path.join(input_dir, 'id.json'), 'r') as f:
        id_document = json.load(f)
    
    with open(os.path.join(input_dir, 'loan_application.json'), 'r') as f:
        loan_application = json.load(f)
    
    with open(os.path.join(input_dir, 'payslip.json'), 'r') as f:
        payslip = json.load(f)
    
    with open(os.path.join(input_dir, 'bank_statement.json'), 'r') as f:
        bank_statement = json.load(f)
    
    return {
        "id_document": id_document,
        "loan_application": loan_application,
        "payslip": payslip,
        "bank_statement": bank_statement,
        "credit_score": 720  # Mock credit score
    }


async def test_orchestrator():
    """Test the full multi-agent orchestrator workflow"""
    
    print("\n" + "="*100)
    print(" "*30 + "AI AGENT ORCHESTRATOR - MANUAL TEST")
    print("="*100 + "\n")
    
    # Load sample data
    print("📁 Loading sample data from input/ folder...")
    application_data = await load_sample_data()
    
    print(f"   ✓ Loaded ID document: {application_data['id_document']['full_name']}")
    print(f"   ✓ Loaded loan application: ${application_data['loan_application']['requested_amount']:,.2f}")
    print(f"   ✓ Loaded payslip: Net pay ${application_data['payslip']['net_pay']:,.2f}")
    print(f"   ✓ Loaded bank statement: {len(application_data['bank_statement']['transactions'])} transactions")
    print(f"   ✓ Mock credit score: {application_data['credit_score']}\n")
    
    # Process application
    application_id = application_data['loan_application']['application_id']
    
    result = await orchestrator.process_application(
        application_id=application_id,
        application_data=application_data
    )
    
    # Display results
    print("\n" + "="*100)
    print(" "*35 + "PROCESSING RESULTS")
    print("="*100 + "\n")
    
    print(f"📋 Application ID: {result['application_id']}")
    print(f"⏱️  Processing Time: {result.get('execution_time_seconds', 0):.2f}s")
    print(f"📊 Status: {result['processing_status']}")
    
    # Handle different result types
    if 'routing_action' in result:
        print(f"🎯 Final Action: {result['routing_action']}")
        
        if result.get('routing_priority'):
            print(f"   Priority: {result['routing_priority']}")
        
        print(f"\n💡 Reason: {result['routing_reason']}")
    elif 'final_decision' in result:
        print(f"🎯 Final Decision: {result['final_decision']}")
        print(f"💡 Reason: {result.get('routing_reason', 'N/A')}")
    
    # Show rejection details if present
    if 'rejection_details' in result:
        print("\n⚠️  REJECTION DETAILS:")
        details = result['rejection_details']
        if isinstance(details, dict):
            for key, value in details.items():
                print(f"   - {key}: {value}")
    
    if result.get('agent_results'):
        print("\n" + "-"*100)
        print("DETAILED AGENT RESULTS:")
        print("-"*100)
        
        # Document Verification
        if 'document_verification' in result['agent_results']:
            doc = result['agent_results']['document_verification']
            print(f"\n📄 DOCUMENT VERIFICATION:")
            print(f"   Valid: {doc['is_valid']}")
            print(f"   Completeness: {doc['completeness_score']:.1%}")
            print(f"   Risk Level: {doc['risk_level']}")
            print(f"   Name Consistent: {doc['name_consistency']}")
            print(f"   ID Consistent: {doc['id_consistency']}")
            print(f"   Employer Consistent: {doc['employer_consistency']}")
            if doc['fraud_indicators']:
                print(f"   ⚠️  Fraud Indicators: {', '.join(doc['fraud_indicators'])}")
        
        # Income Analysis
        if 'income_analysis' in result['agent_results']:
            income = result['agent_results']['income_analysis']
            print(f"\n💰 INCOME ANALYSIS:")
            print(f"   Average Monthly Income: ${income['average_monthly_income']:,.2f}")
            print(f"   Verified Income (Payslip): ${income['verified_monthly_income']:,.2f}")
            print(f"   Income verified: {income['income_verification_passed']}")
            print(f"   Stability Score: {income['income_stability_score']:.1%}")
            print(f"   Salary Deposits: {income['salary_deposits_count']}")
            print(f"   Income Trend: {income['income_trend']}")
            if income['unusual_transactions']:
                print(f"   ⚠️  Unusual Transactions: {len(income['unusual_transactions'])}")
        
        # Debt Assessment
        if 'debt_assessment' in result['agent_results']:
            debt = result['agent_results']['debt_assessment']
            print(f"\n💳 DEBT ASSESSMENT:")
            print(f"   Declared Debt: ${debt['declared_debt_payments']:,.2f}/month")
            print(f"   Observed Debt: ${debt['observed_debt_payments']:,.2f}/month")
            print(f"   DTI Ratio: {debt['debt_to_income_ratio']:.1%}")
            print(f"   Risk: {debt['risk_assessment']}")
            if debt['discrepancy_detected']:
                print(f"   ⚠️  Discrepancy Detected!")
        
        # Compliance
        if 'compliance_check' in result['agent_results']:
            comp = result['agent_results']['compliance_check']
            print(f"\n✅ COMPLIANCE CHECK:")
            print(f"   Overall Compliant: {comp['compliant']}")
            print(f"   Age: {comp['applicant_age']} years")
            print(f"   Age Verified: {comp['age_verified']}")
            print(f"   Identity Verified: {comp['identity_verified']}")
            print(f"   Employment Verified: {comp['employment_verified']}")
            print(f"   Sanctions Clear: {comp['sanctions_clear']}")
            if comp['violations']:
                print(f"   ⚠️  Violations: {len(comp['violations'])}")
                for v in comp['violations']:
                    print(f"      - {v.get('rule', 'Unknown')}: {v.get('message', '')}")
        
        # Final Report
        if 'final_report' in result['agent_results']:
            report = result['agent_results']['final_report']
            print(f"\n📊 FINAL REPORT:")
            print(f"   Overall Risk: {report['overall_risk_level']}")
            print(f"   Recommendation: {report['recommendation']}")
            print(f"   Confidence: {report['confidence_score']:.1%}")
            print(f"\n   Summary: {report['summary']}")
            
            if report['strengths']:
                print(f"\n   💪 Strengths:")
                for s in report['strengths']:
                    print(f"      • {s}")
            
            if report['weaknesses']:
                print(f"\n   ⚠️  Weaknesses:")
                for w in report['weaknesses']:
                    print(f"      • {w}")
            
            if report['risk_factors']:
                print(f"\n   🚨 Risk Factors:")
                for r in report['risk_factors']:
                    print(f"      • {r}")
    
    print("\n" + "="*100)
    print(" "*35 + "TEST COMPLETE")
    print("="*100 + "\n")
    
    # Save results to file for review
    output_file = os.path.join(os.path.dirname(__file__), 'test_orchestrator_output.json')
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2, default=str)
    
    print(f"📝 Full results saved to: {output_file}\n")


if __name__ == "__main__":
    # Run the test
    asyncio.run(test_orchestrator())
