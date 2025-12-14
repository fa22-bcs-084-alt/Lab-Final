import logging
import os
import requests
import json
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Hygieia MCP Server")

# API Gateway base URL
API_GATEWAY_BASE_URL = os.getenv('API_GATEWAY_URL', 'http://localhost:4000')

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

# ---------------- TOOLS ----------------

@mcp.tool(description="Book a new appointment")
def book_appointment(patient_id, doctor_id, date, time):
    logging.info(f"Function called: book_appointment(patient_id={patient_id}, doctor_id={doctor_id}, date={date}, time={time})")
    
    try:
        # Prepare appointment data
        appointment_data = {
            "patientId": patient_id,
            "doctorId": doctor_id,
            "appointmentDate": date,
            "appointmentTime": time,
            "type": "CONSULTATION",
            "mode": "ONLINE",
            "status": "SCHEDULED"
        }
        
        # Make HTTP request to API Gateway
        response = requests.post(
            f"{API_GATEWAY_BASE_URL}/appointments",
            json=appointment_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 201:
            return {"success": True, "data": response.json(), "message": "Appointment booked successfully"}
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
            
    except Exception as e:
        logging.error(f"Error booking appointment: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="Reschedule an existing appointment")
def reschedule_appointment(appointment_id, new_date, new_time):
    logging.info(f"Function called: reschedule_appointment(appointment_id={appointment_id}, new_date={new_date}, new_time={new_time})")
    
    try:
        # Prepare update data
        update_data = {
            "appointmentDate": new_date,
            "appointmentTime": new_time,
            "status": "RESCHEDULED"
        }
        
        # Make HTTP request to API Gateway
        response = requests.patch(
            f"{API_GATEWAY_BASE_URL}/appointments/{appointment_id}",
            json=update_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            return {"success": True, "data": response.json(), "message": "Appointment rescheduled successfully"}
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
            
    except Exception as e:
        logging.error(f"Error rescheduling appointment: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="Cancel an appointment")
def cancel_appointment(appointment_id):
    logging.info(f"Function called: cancel_appointment(appointment_id={appointment_id})")
    
    try:
        # Make HTTP request to API Gateway
        response = requests.delete(f"{API_GATEWAY_BASE_URL}/appointments/{appointment_id}")
        
        if response.status_code == 200:
            return {"success": True, "message": "Appointment cancelled successfully"}
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
            
    except Exception as e:
        logging.error(f"Error cancelling appointment: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="Ask a question from medical records")
def question_from_medical_records(patient_id, question):
    logging.info(f"Function called: question_from_medical_records(patient_id={patient_id}, question={question})")
    
    try:
        # First get the patient's medical records
        response = requests.get(f"{API_GATEWAY_BASE_URL}/medical-records/patient/{patient_id}")
        
        if response.status_code == 200:
            medical_records = response.json()
            # Here you would typically process the question with AI/LLM
            # For now, return the records with the question
            return {
                "success": True, 
                "question": question,
                "medical_records": medical_records,
                "message": "Medical records retrieved. Question processing would require AI integration."
            }
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
            
    except Exception as e:
        logging.error(f"Error retrieving medical records: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="View all prescriptions for a patient")
def view_all_prescriptions(patient_id):
    logging.info(f"Function called: view_all_prescriptions(patient_id={patient_id})")
    
    try:
        # Note: This route doesn't exist yet in API Gateway
        # We'll need to create it or use a placeholder
        response = requests.get(f"{API_GATEWAY_BASE_URL}/prescriptions/patient/{patient_id}")
        
        if response.status_code == 200:
            prescriptions = response.json()
            return {"success": True, "prescriptions": prescriptions}
        else:
            return {
                "success": False, 
                "error": "Prescriptions route not implemented yet", 
                "status_code": response.status_code,
                "message": "This feature requires implementing prescriptions endpoint in API Gateway"
            }
            
    except Exception as e:
        logging.error(f"Error retrieving prescriptions: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="Book a lab test")
def book_lab_test(patient_id, test_name, date):
    logging.info(f"Function called: book_lab_test(patient_id={patient_id}, test_name={test_name}, date={date})")
    
    try:
        # Prepare lab test booking data
        booking_data = {
            "testId": test_name,  # Assuming test_name is the test ID
            "patientId": patient_id,
            "scheduledDate": date,
            "scheduledTime": "09:00",  # Default time, could be made configurable
            "location": "Main Lab",
            "instructions": ["Fasting required", "Bring ID"]
        }
        
        # Make HTTP request to API Gateway
        response = requests.post(
            f"{API_GATEWAY_BASE_URL}/booked-lab-tests",
            json=booking_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 201:
            return {"success": True, "data": response.json(), "message": "Lab test booked successfully"}
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
            
    except Exception as e:
        logging.error(f"Error booking lab test: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="Cancel a lab test")
def cancel_lab_test(test_id):
    logging.info(f"Function called: cancel_lab_test(test_id={test_id})")
    
    try:
        # Make HTTP request to API Gateway
        response = requests.patch(f"{API_GATEWAY_BASE_URL}/booked-lab-tests/{test_id}/cancel")
        
        if response.status_code == 200:
            return {"success": True, "message": "Lab test cancelled successfully"}
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
            
    except Exception as e:
        logging.error(f"Error cancelling lab test: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="List all doctors and nutritionists")
def list_doctors_and_nutritionists():
    logging.info("Function called: list_doctors_and_nutritionists()")
    
    try:
        # Get nutritionists from existing endpoint
        nutritionists_response = requests.get(f"{API_GATEWAY_BASE_URL}/nutritionists")
        
        # Get doctors from new endpoint
        doctors_response = requests.get(f"{API_GATEWAY_BASE_URL}/doctors")
        
        nutritionists = []
        doctors = []
        
        if nutritionists_response.status_code == 200:
            nutritionists = nutritionists_response.json()
        
        if doctors_response.status_code == 200:
            doctors = doctors_response.json()
        
        return {
            "success": True, 
            "nutritionists": nutritionists,
            "doctors": doctors,
            "message": "Doctors and nutritionists retrieved successfully."
        }
            
    except Exception as e:
        logging.error(f"Error retrieving doctors and nutritionists: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="View all pending appointments for a patient")
def view_pending_appointments(patient_id):
    logging.info(f"Function called: view_pending_appointments(patient_id={patient_id})")
    
    try:
        # Get appointments for patient with pending status
        response = requests.get(
            f"{API_GATEWAY_BASE_URL}/appointments/patient",
            params={"patientId": patient_id, "status": "SCHEDULED"}
        )
        
        if response.status_code == 200:
            appointments = response.json()
            return {"success": True, "appointments": appointments}
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
            
    except Exception as e:
        logging.error(f"Error retrieving pending appointments: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="View all pending lab tests for a patient")
def view_pending_lab_tests(patient_id):
    logging.info(f"Function called: view_pending_lab_tests(patient_id={patient_id})")
    
    try:
        # Get lab test bookings for patient
        response = requests.get(f"{API_GATEWAY_BASE_URL}/booked-lab-tests/patient/{patient_id}")
        
        if response.status_code == 200:
            lab_tests = response.json()
            return {"success": True, "lab_tests": lab_tests}
        else:
            return {"success": False, "error": response.text, "status_code": response.status_code}
            
    except Exception as e:
        logging.error(f"Error retrieving pending lab tests: {str(e)}")
        return {"success": False, "error": str(e)}

@mcp.tool(description="View today's medicines for a patient")
def todays_medicine(patient_id):
    logging.info(f"Function called: todays_medicine(patient_id={patient_id})")
    
    try:
        # Note: This route doesn't exist yet in API Gateway
        # We'll need to create it or use a placeholder
        response = requests.get(f"{API_GATEWAY_BASE_URL}/medicines/today/{patient_id}")
        
        if response.status_code == 200:
            medicines = response.json()
            return {"success": True, "medicines": medicines}
        else:
            return {
                "success": False, 
                "error": "Today's medicines route not implemented yet", 
                "status_code": response.status_code,
                "message": "This feature requires implementing medicines endpoint in API Gateway"
            }
            
    except Exception as e:
        logging.error(f"Error retrieving today's medicines: {str(e)}")
        return {"success": False, "error": str(e)}


# ---------------- RESOURCES ----------------

@mcp.resource("resource://appointments/{patient_id}", description="All appointments of a patient")
def appointments_resource(patient_id: str):
    logging.info(f"Resource requested: appointments for patient {patient_id}")
    
    try:
        response = requests.get(
            f"{API_GATEWAY_BASE_URL}/appointments/patient",
            params={"patientId": patient_id}
        )
        
        if response.status_code == 200:
            appointments = response.json()
            return {"appointments": appointments}
        else:
            return {"error": f"Failed to fetch appointments: {response.text}"}
            
    except Exception as e:
        logging.error(f"Error fetching appointments resource: {str(e)}")
        return {"error": str(e)}

@mcp.resource("resource://prescriptions/{patient_id}", description="All prescriptions of a patient")
def prescriptions_resource(patient_id: str):
    logging.info(f"Resource requested: prescriptions for patient {patient_id}")
    
    try:
        response = requests.get(f"{API_GATEWAY_BASE_URL}/prescriptions/patient/{patient_id}")
        
        if response.status_code == 200:
            prescriptions = response.json()
            return {"prescriptions": prescriptions}
        else:
            return {"error": "Prescriptions endpoint not implemented yet", "message": "This resource requires implementing prescriptions endpoint in API Gateway"}
            
    except Exception as e:
        logging.error(f"Error fetching prescriptions resource: {str(e)}")
        return {"error": str(e)}

@mcp.resource("resource://labtests/{patient_id}", description="All lab tests of a patient")
def labtests_resource(patient_id: str):
    logging.info(f"Resource requested: lab tests for patient {patient_id}")
    
    try:
        response = requests.get(f"{API_GATEWAY_BASE_URL}/booked-lab-tests/patient/{patient_id}")
        
        if response.status_code == 200:
            lab_tests = response.json()
            return {"labtests": lab_tests}
        else:
            return {"error": f"Failed to fetch lab tests: {response.text}"}
            
    except Exception as e:
        logging.error(f"Error fetching lab tests resource: {str(e)}")
        return {"error": str(e)}

@mcp.resource("resource://doctors", description="List of all doctors and nutritionists")
def doctors_resource():
    logging.info("Resource requested: doctors and nutritionists list")
    
    try:
        # Get nutritionists from existing endpoint
        nutritionists_response = requests.get(f"{API_GATEWAY_BASE_URL}/nutritionists")
        
        # Get doctors from new endpoint
        doctors_response = requests.get(f"{API_GATEWAY_BASE_URL}/doctors")
        
        nutritionists = []
        doctors = []
        
        if nutritionists_response.status_code == 200:
            nutritionists = nutritionists_response.json()
        
        if doctors_response.status_code == 200:
            doctors = doctors_response.json()
        
        return {
            "doctors": doctors,
            "nutritionists": nutritionists,
            "message": "Doctors and nutritionists retrieved successfully."
        }
            
    except Exception as e:
        logging.error(f"Error fetching doctors resource: {str(e)}")
        return {"error": str(e)}

@mcp.resource("resource://todays-medicine/{patient_id}", description="Today's medicines for a patient")
def todays_medicine_resource(patient_id: str):
    logging.info(f"Resource requested: today's medicines for patient {patient_id}")
    
    try:
        response = requests.get(f"{API_GATEWAY_BASE_URL}/medicines/today/{patient_id}")
        
        if response.status_code == 200:
            medicines = response.json()
            return {"todays_medicine": medicines}
        else:
            return {"error": "Today's medicines endpoint not implemented yet", "message": "This resource requires implementing medicines endpoint in API Gateway"}
            
    except Exception as e:
        logging.error(f"Error fetching today's medicine resource: {str(e)}")
        return {"error": str(e)}


if __name__ == "__main__":
    mcp.run(transport="stdio")
    print("server started")
