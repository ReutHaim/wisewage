const fs = require("fs");
const pdfParse = require("pdf-parse");
const { callGemini, callGeminiWithFile } = require("./geminiService");
const path = require("path");

function cleanGeminiOutput(output) {
    return output
        .replace(/```json\s*/gi, '')
        .replace(/```/g, '')
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

async function parseWorkerFromPDF(filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    
    try {
        const prompt = `You are a contract analyzer specialized in Israeli employment contracts. This PDF contains an employee contract in Hebrew.

CRITICAL RULES FOR EXTRACTION:
1. LEGAL MINIMUMS - When contract mentions "לפי החוק" or similar:
   - Sick Days (ימי מחלה): MUST set to 18 days per year
   - Vacation Days (ימי חופשה): MUST set to 12 days minimum for 5-day work week
   - Convalescence (דמי הבראה): MUST set to 5 days minimum after first year
   - DO NOT leave these as 0 when contract says "לפי החוק"

2. BONUS AND ALLOWANCE HANDLING:
   - If contract mentions monthly bonus (בונוס חודשי) of X ₪:
     * If it's for extra hours - put in extraHoursBonus
     * If it's for non-competition - put in nonCompetitionBonus
     * Otherwise - add to otherAllowances
   - If contract mentions annual bonus (בונוס שנתי) of Y ₪:
     * Calculate monthly amount (Y/12) and add to otherAllowances
   - Never include same bonus in multiple fields

3. CONTRIBUTION RATES:
   When mentioned as "לפי החוק" or similar, MUST set to:
   - employerSeverance: 8.33%
   - employeePension: 6%
   - employerPension: 6.5%
   - If קרן השתלמות mentioned:
     * employeeEducationFund: 2.5%
     * employerEducationFund: 7.5%

4. SEARCH AND CALCULATE:
   - Search for בונוס שנתי and calculate monthly portion
   - Look for monthly fixed amounts (סכום חודשי קבוע)
   - Check for special bonuses or grants (מענקים מיוחדים)
   - Verify if any allowance is conditional (e.g., after probation)
   - For each benefit, determine if it's:
     * Monthly fixed amount
     * Annual amount to be divided
     * One-time payment
     * Performance-based

5. VALIDATION:
   - DO NOT leave legally mandated benefits as 0
   - If contract says "לפי החוק" - use legal minimums
   - Monthly bonus amounts stay as monthly
   - Annual bonus amounts must be divided by 12

6. PERSONAL ID VS PHONE NUMBER:
   - Personal ID (תעודת זהות) MUST be exactly 9 digits
   - Look for תעודת זהות/ת.ז./ת"ז/תז near the beginning of contract
   - Israeli phone numbers follow these patterns:
     * Mobile: 05X-XXXXXXX (10 digits total, starts with 050-059)
     * Landline: 0X-XXXXXXX (9 digits total, starts with 02-04, 08, 09)
   - DO NOT confuse phone numbers with ID numbers

"lastName": "שם משפחה - extract last name in Hebrew",
  "address": "כתובת - full address in Hebrew",
  "role": "תפקיד/משרה - job title in Hebrew",
  "department": "מחלקה - department name in Hebrew",
  "startDate": "תאריך תחילת עבודה - date in format YYYY-MM-DD",
  "email": "דואר אלקטרוני/אימייל",
  "phone": "טלפון/נייד - must match Israeli format: 05X-XXXXXXX for mobile or 0X-XXXXXXX for landline",
  "personalId": "חפש תעודת זהות/ת.ז./ת"ז/תז - MUST be exactly 9 digits, usually appears at start of contract",
  "baseSalary": "שכר בסיס/משכורת בסיס - extract amount in NIS as number",
  "travelAllowance": "דמי נסיעות/החזר נסיעות - amount in NIS as number, default 0",
  "mealAllowance": "דמי אוכל/ארוחות - amount in NIS as number, default 0",
  "phoneAllowance": "דמי טלפון/החזר טלפון - amount in NIS as number, default 0",
  "carAllowance": "אחזקת רכב - amount in NIS as number, default 0",
  "extraHoursBonus": "תשלום שעות נוספות/גמול שעות נוספות - amount in NIS as number, default 0",
  "nonCompetitionBonus": "תמורת אי תחרות/תשלום עבור אי תחרות - amount in NIS as number, default 0",
  "maxAnnualVectionDays": "ימי חופשה שנתית - number of days",
  "maxAnnualSickDays": "ימי מחלה - number of days",
  "maxAnnualConvalescenceDays": "ימי הבראה - number of days",
  "contributionRates": {
    "employeeSeverance": "הפרשות עובד לפיצויים - percentage as number",
    "employerSeverance": "הפרשות מעסיק לפיצויים - percentage as number",
    "employeePension": "הפרשות עובד לתגמולים/פנסיה - percentage as number",
    "employerPension": "הפרשות מעסיק לתגמולים/פנסיה - percentage as number",
    "employeeEducationFund": "הפרשות עובד לקרן השתלמות - percentage as number",
    "employerEducationFund": "הפרשות מעסיק לקרן השתלמות - percentage as number"
  },
  "otherAllowances": "הטבות נוספות - total amount in NIS as number, sum of any additional benefits NOT already included in other fields (like travel, meals, phone, car, extra hours, or non-competition)"
}

Important:
1. Extract all monetary values as numbers (without currency symbol or commas)
2. Convert all percentages to numbers (e.g., 6.0 instead of "6%")
3. Keep text fields in Hebrew when they appear in Hebrew in the contract
4. For otherAllowances, ONLY include benefits that are not already captured in other specific fields
   - DO NOT include: travel, meals, phone, car, extra hours, or non-competition amounts
   - DO include: any other monetary benefits not covered by other fields
5. For any monetary fields that are not found, return 0 instead of null
6. Look in sections like:
   - סעיף שכר/תנאי העסקה
   - סעיף הפרשות סוציאליות
   - סעיף זכויות עובד
   - סעיף אי תחרות/סודיות
   - נספח א
   - טופס 101`;

        const structuredJson = cleanGeminiOutput(
            await callGeminiWithFile(fileBuffer, prompt)
        );

        try {
            const parsed = JSON.parse(structuredJson);
            
            if (parsed.maxAnnualSickDays === 0) parsed.maxAnnualSickDays = 18;
            if (parsed.maxAnnualVectionDays === 0) parsed.maxAnnualVectionDays = 12;
            if (parsed.maxAnnualConvalescenceDays === 0) parsed.maxAnnualConvalescenceDays = 5;

            // Validate personal ID
            if (parsed.personalId) {
                const cleanId = parsed.personalId.replace(/\D/g, ''); // Remove non-digits
                if (cleanId.length !== 9) {
                    console.warn("Invalid personal ID length detected, clearing the field");
                    parsed.personalId = '';
                } else {
                    parsed.personalId = cleanId;
                }
            }

            // Validate phone number
            if (parsed.phone) {
                const cleanPhone = parsed.phone.replace(/\D/g, ''); // Remove non-digits
                const isValidMobile = /^05\d{8}$/.test(cleanPhone); // 05X-XXXXXXX
                const isValidLandline = /^0([234]|[89])\d{7}$/.test(cleanPhone); // 0X-XXXXXXX where X is 2-4,8,9
                
                if (!isValidMobile && !isValidLandline) {
                    console.warn("Invalid Israeli phone number format detected, clearing the field");
                    parsed.phone = '';
                } else {
                    parsed.phone = cleanPhone;
                }
            }

            if (!parsed.contributionRates) {
                parsed.contributionRates = {};
            }

            if (!parsed.contributionRates.employerSeverance) parsed.contributionRates.employerSeverance = 8.33;
            if (!parsed.contributionRates.employeePension) parsed.contributionRates.employeePension = 6;
            if (!parsed.contributionRates.employerPension) parsed.contributionRates.employerPension = 6.5;
            if (!parsed.contributionRates.employeeEducationFund) parsed.contributionRates.employeeEducationFund = 2.5;
            if (!parsed.contributionRates.employerEducationFund) parsed.contributionRates.employerEducationFund = 7.5;

            const monetaryFields = [
                'baseSalary',
                'travelAllowance',
                'mealAllowance',
                'phoneAllowance',
                'carAllowance',
                'extraHoursBonus',
                'nonCompetitionBonus',
                'otherAllowances'
            ];
            
            monetaryFields.forEach(field => {
                parsed[field] = Number(parsed[field]) || 0;
            });

            return parsed;
        } catch (jsonError) {
            console.warn("Failed to parse JSON from file processing:", jsonError);
            throw new Error("Failed to parse contract data");
        }
    } catch (err) {
        console.error("PDF parsing error:", err);
        throw new Error("Failed to process contract");
    }
}

module.exports = { parseWorkerFromPDF };