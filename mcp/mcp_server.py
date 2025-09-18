import logging
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("Hygieia MCP Server")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()]
)

# ---------------- TOOLS ----------------

@mcp.tool(description="Book a new appointment")
def book_appointment(patient_id, doctor_id, date, time):
    logging.info(f"Function called: book_appointment(patient_id={patient_id}, doctor_id={doctor_id}, date={date}, time={time})")
    return {"message": "book_appointment called"}

@mcp.tool(description="Reschedule an existing appointment")
def reschedule_appointment(appointment_id, new_date, new_time):
    logging.info(f"Function called: reschedule_appointment(appointment_id={appointment_id}, new_date={new_date}, new_time={new_time})")
    return {"message": "reschedule_appointment called"}

@mcp.tool(description="Cancel an appointment")
def cancel_appointment(appointment_id):
    logging.info(f"Function called: cancel_appointment(appointment_id={appointment_id})")
    return {"message": "cancel_appointment called"}

@mcp.tool(description="Ask a question from medical records")
def question_from_medical_records(patient_id, question):
    logging.info(f"Function called: question_from_medical_records(patient_id={patient_id}, question={question})")
    return {"message": "question_from_medical_records called"}

@mcp.tool(description="View all prescriptions for a patient")
def view_all_prescriptions(patient_id):
    logging.info(f"Function called: view_all_prescriptions(patient_id={patient_id})")
    return {"message": "view_all_prescriptions called"}

@mcp.tool(description="Book a lab test")
def book_lab_test(patient_id, test_name, date):
    logging.info(f"Function called: book_lab_test(patient_id={patient_id}, test_name={test_name}, date={date})")
    return {"message": "book_lab_test called"}

@mcp.tool(description="Cancel a lab test")
def cancel_lab_test(test_id):
    logging.info(f"Function called: cancel_lab_test(test_id={test_id})")
    return {"message": "cancel_lab_test called"}

@mcp.tool(description="List all doctors and nutritionists")
def list_doctors_and_nutritionists():
    logging.info("Function called: list_doctors_and_nutritionists()")
    return {"message": "list_doctors_and_nutritionists called"}

@mcp.tool(description="View all pending appointments for a patient")
def view_pending_appointments(patient_id):
    logging.info(f"Function called: view_pending_appointments(patient_id={patient_id})")
    return {"message": "view_pending_appointments called"}

@mcp.tool(description="View all pending lab tests for a patient")
def view_pending_lab_tests(patient_id):
    logging.info(f"Function called: view_pending_lab_tests(patient_id={patient_id})")
    return {"message": "view_pending_lab_tests called"}

@mcp.tool(description="View today's medicines for a patient")
def todays_medicine(patient_id):
    logging.info(f"Function called: todays_medicine(patient_id={patient_id})")
    return {"message": "todays_medicine called"}


# ---------------- RESOURCES ----------------

@mcp.resource("resource://appointments/{patient_id}", description="All appointments of a patient")
def appointments_resource(patient_id: str):
    logging.info(f"Resource requested: appointments for patient {patient_id}")
    return {"appointments": f"All appointments for patient {patient_id}"}

@mcp.resource("resource://prescriptions/{patient_id}", description="All prescriptions of a patient")
def prescriptions_resource(patient_id: str):
    logging.info(f"Resource requested: prescriptions for patient {patient_id}")
    return {"prescriptions": f"All prescriptions for patclient {patient_id}"}

@mcp.resource("resource://labtests/{patient_id}", description="All lab tests of a patient")
def labtests_resource(patient_id: str):
    logging.info(f"Resource requested: lab tests for patient {patient_id}")
    return {"labtests": f"All lab tests for patient {patient_id}"}

@mcp.resource("resource://doctors", description="List of all doctors and nutritionists")
def doctors_resource():
    logging.info("Resource requested: doctors and nutritionists list")
    return {"doctors": "List of all doctors and nutritionists"}

@mcp.resource("resource://todays-medicine/{patient_id}", description="Today's medicines for a patient")
def todays_medicine_resource(patient_id: str):
    logging.info(f"Resource requested: today's medicines for patient {patient_id}")
    return {"todays_medicine": f"Medicines for patient {patient_id} today"}


if __name__ == "__main__":
    mcp.run(transport="stdio")
    print("server started")
