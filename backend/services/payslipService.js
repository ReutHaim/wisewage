const { callGemini } = require("./geminiService");

function cleanGeminiOutput(output) {
    return output
        .replace(/```json\s*/gi, '')
        .replace(/```/g, '')
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

async function generatePayslip(worker, input) {
    const prompt = `
    Create a payslip in JSON format for the following employee based on their role and salary details. Include a breakdown of salary calculation. Don't return markdown, only valid JSON.

    Employee Info:
    - Name: ${worker.firstName} ${worker.lastName}
    - Role: ${worker.role}
    - Personal ID: ${worker.personalId}
    - Salary Terms: ${worker.salaryDetails}

    Monthly Input:
    - Work Hours: ${input.workHours}
    - Vacation Days: ${input.vacationDays}
    - Sick Days: ${input.sickDays}
    - Monthly Bonus: ${input.monthlyBonus}

    Return format example:
    {
      "employee": "שם מלא",
      "month": "05/2025",
      "baseSalary": 8500,
      "bonus": 500,
      "vacationDeduction": 0,
      "sickDaysDeduction": 200,
      "finalSalary": 8800,
      "details": "חישוב מפורט של כל מרכיבי השכר"
    }
    `;

    const result = await callGemini(prompt);
    const cleaned = cleanGeminiOutput(result);

    try {
        const parsed = JSON.parse(cleaned);
        return parsed;
    } catch (e) {
        console.error("Gemini output parse error", cleaned);
        throw new Error("Invalid Gemini response format");
    }
}

module.exports = { generatePayslip };