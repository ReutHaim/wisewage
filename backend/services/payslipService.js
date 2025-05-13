const { callGemini } = require("./geminiService");

function cleanGeminiOutput(output) {
    return output
        .replace(/```json\s*/gi, '')
        .replace(/```/g, '')
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

function calculateWorkingDays(month, year) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let workingDays = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        if (date.getDay() !== 5 && date.getDay() !== 6) {
            workingDays++;
        }
    }
    
    return workingDays;
}

function calculateDailyRate(baseSalary, workingDays) {
    return baseSalary / workingDays;
}

async function generatePayslip(worker, input) {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const workingDays = calculateWorkingDays(month, year);
    
    // Calculate base values
    const baseSalary = worker.baseSalary || 0;
    const dailyRate = calculateDailyRate(baseSalary, workingDays);
    const vacationDeduction = dailyRate * (input.vacationDays || 0);
    const sickDayDeduction = dailyRate * (input.sickDays || 0);
    
    // Calculate total allowances
    const totalAllowances = (worker.travelAllowance || 0) +
        (worker.mealAllowance || 0) +
        (worker.phoneAllowance || 0) +
        (worker.carAllowance || 0);

    // Calculate gross salary
    const grossSalary = baseSalary + totalAllowances + (input.monthlyBonus || 0);

    const prompt = `
    אתה יועץ מס ישראלי מומחה בחישוב תלושי שכר. אנא חשב תלוש שכר לפי החוק הישראלי.
    החזר רק JSON תקין עם כל החישובים, ללא הסברים נוספים.

    מידע כללי:
    - חודש: ${month}
    - שנה: ${year}
    - ימי עבודה בחודש: ${workingDays}

    פרטי העובד:
    - שם מלא: ${worker.firstName} ${worker.lastName}
    - תפקיד: ${worker.role}
    - מחלקה: ${worker.department || 'לא צוין'}
    - ת.ז.: ${worker.personalId}

    נתוני שכר:
    - שכר בסיס: ${baseSalary} ₪
    - דמי נסיעות: ${worker.travelAllowance || 0} ₪
    - דמי אוכל: ${worker.mealAllowance || 0} ₪
    - דמי טלפון: ${worker.phoneAllowance || 0} ₪
    - אחזקת רכב: ${worker.carAllowance || 0} ₪
    - בונוס חודשי: ${input.monthlyBonus || 0} ₪
    - שכר ברוטו לפני ניכויים: ${grossSalary} ₪

    נתוני נוכחות:
    - ימי חופשה: ${input.vacationDays || 0} ימים
    - ימי מחלה: ${input.sickDays || 0} ימים
    - שעות עבודה: ${input.workHours || 182} שעות

    הפרשות פנסיוניות:
    - הפרשות עובד לפיצויים: ${worker.contributionRates?.employeeSeverance || 6.0}%
    - הפרשות מעסיק לפיצויים: ${worker.contributionRates?.employerSeverance || 8.33}%
    - הפרשות עובד לתגמולים: ${worker.contributionRates?.employeePension || 6.0}%
    - הפרשות מעסיק לתגמולים: ${worker.contributionRates?.employerPension || 6.5}%
    - הפרשות עובד לקרן השתלמות: ${worker.contributionRates?.employeeEducationFund || 2.5}%
    - הפרשות מעסיק לקרן השתלמות: ${worker.contributionRates?.employerEducationFund || 7.5}%

    נדרש ממך:
    1. חשב את כל הניכויים לפי החוק הישראלי:
       - מס הכנסה לפי מדרגות המס העדכניות
       - ביטוח לאומי לפי התקרות העדכניות
       - ביטוח בריאות לפי החוק
       - הפרשות פנסיוניות
       - קרן השתלמות
       - ניכויי חופשה ומחלה

    2. הוסף הערות רלוונטיות לגבי:
       - זכאות לנקודות זיכוי
       - חריגה ממכסת ימי חופשה/מחלה
       - חישובים מיוחדים שבוצעו

    החזר JSON בפורמט הבא:
    {
      "employeeDetails": {
        "fullName": "${worker.firstName} ${worker.lastName}",
        "role": "${worker.role}",
        "department": "${worker.department || 'לא צוין'}",
        "personalId": "${worker.personalId}"
      },
      "period": {
        "month": "${month.toString().padStart(2, '0')}",
        "year": "${year}",
        "workingDays": ${workingDays},
        "actualWorkDays": ${workingDays - (input.vacationDays || 0) - (input.sickDays || 0)}
      },
      "salary": {
        "baseSalary": ${baseSalary},
        "travelAllowance": ${worker.travelAllowance || 0},
        "mealAllowance": ${worker.mealAllowance || 0},
        "phoneAllowance": ${worker.phoneAllowance || 0},
        "carAllowance": ${worker.carAllowance || 0},
        "monthlyBonus": ${input.monthlyBonus || 0},
        "totalGross": ${grossSalary}
      },
      "deductions": {
        "incomeTax": {
          "amount": 0,
          "taxBrackets": [],
          "creditPoints": 0
        },
        "nationalInsurance": {
          "employee": 0,
          "employer": 0,
          "brackets": []
        },
        "healthInsurance": {
          "amount": 0,
          "brackets": []
        },
        "pension": {
          "employee": 0,
          "employer": 0,
          "base": 0
        },
        "severance": {
          "employee": 0,
          "employer": 0,
          "base": 0
        },
        "educationFund": {
          "employee": 0,
          "employer": 0,
          "base": 0
        },
        "vacationDays": {
          "days": ${input.vacationDays || 0},
          "amount": ${Math.round(vacationDeduction)},
          "balance": 0
        },
        "sickDays": {
          "days": ${input.sickDays || 0},
          "amount": ${Math.round(sickDayDeduction)},
          "balance": 0
        },
        "totalDeductions": 0
      },
      "summary": {
        "grossSalary": ${grossSalary},
        "totalDeductions": 0,
        "netSalary": 0,
        "employerCost": 0
      },
      "calculations": {
        "taxDetails": "",
        "specialNotes": []
      }
    }`;

    const result = await callGemini(prompt);
    const cleaned = cleanGeminiOutput(result);

    try {
        const parsed = JSON.parse(cleaned);
        return parsed;
    } catch (e) {
        console.error("Gemini output parse error", cleaned);
        throw new Error("שגיאה בעיבוד תלוש השכר");
    }
}

module.exports = { generatePayslip };