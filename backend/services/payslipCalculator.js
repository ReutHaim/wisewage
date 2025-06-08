const TAX_BRACKETS_2025 = [
    { threshold: 0, rate: 0.10 },
    { threshold: 7550, rate: 0.14 },
    { threshold: 10880, rate: 0.20 },
    { threshold: 17830, rate: 0.31 },
    { threshold: 25260, rate: 0.35 },
    { threshold: 51520, rate: 0.47 },
    { threshold: 78960, rate: 0.50 }
];

const BITUACH_LEUMI_BRACKETS_2025 = [
    { threshold: 0, employeeRate: 0.004, employerRate: 0.0355 },
    { threshold: 7550, employeeRate: 0.07, employerRate: 0.0755 }
];

const HEALTH_INSURANCE_BRACKETS_2025 = [
    { threshold: 0, rate: 0.031 }, 
    { threshold: 7550, rate: 0.05 }
];

const CREDIT_POINT_VALUE = 249;

const MOCK_COMPANIES = {
    "COMP001": {
        name: "WiseWage Technologies Ltd.",
        address: "30 HaBarzel St.",
        city: "Tel Aviv",
        taxFile: "936254341",
        companyId: "515887156"
    },
    "COMP002": {
        name: "Tech Innovations Ltd.",
        address: "5 Rothschild Blvd.",
        city: "Tel Aviv",
        taxFile: "847365291",
        companyId: "514998877"
    },
    "COMP003": {
        name: "Digital Solutions Inc.",
        address: "12 Begin Road",
        city: "Jerusalem",
        taxFile: "765438219",
        companyId: "513776655"
    }
};

class PayslipCalculator {
    async getCompanyData(companyCode, db) {
        // For now, return default company data
        // In the future, this can be fetched from the database
        return {
            name: 'WiseWage',
            address: 'הברזל 3',
            city: 'תל אביב',
            taxFile: '123456789',
            id: '515151515'
        };
    }

    calculateIncomeTax(grossSalary, creditPoints) {
        let remainingSalary = grossSalary;
        let totalTax = 0;
        const brackets = [];

        for (let i = 0; i < TAX_BRACKETS_2025.length; i++) {
            const currentBracket = TAX_BRACKETS_2025[i];
            const nextBracket = TAX_BRACKETS_2025[i + 1];
            
            const bracketIncome = nextBracket 
                ? Math.min(remainingSalary, nextBracket.threshold - currentBracket.threshold)
                : remainingSalary;
            
            if (bracketIncome <= 0) break;
            
            const bracketTax = bracketIncome * currentBracket.rate;
            totalTax += bracketTax;
            remainingSalary -= bracketIncome;
            
            brackets.push({
                income: bracketIncome,
                rate: currentBracket.rate,
                tax: bracketTax
            });
        }

        const creditPointsValue = creditPoints * CREDIT_POINT_VALUE;
        totalTax = Math.max(0, totalTax - creditPointsValue);

        return {
            amount: Math.round(totalTax),
            taxBrackets: brackets,
            creditPoints: creditPoints,
            creditPointsValue: creditPointsValue
        };
    }

    calculateNationalInsurance(grossSalary) {
        let remainingSalary = grossSalary;
        let totalEmployeePayment = 0;
        let totalEmployerPayment = 0;
        const brackets = [];

        for (let i = 0; i < BITUACH_LEUMI_BRACKETS_2025.length; i++) {
            const currentBracket = BITUACH_LEUMI_BRACKETS_2025[i];
            const nextBracket = BITUACH_LEUMI_BRACKETS_2025[i + 1];
            
            const bracketIncome = nextBracket 
                ? Math.min(remainingSalary, nextBracket.threshold - currentBracket.threshold)
                : remainingSalary;
            
            if (bracketIncome <= 0) break;
            
            const employeePayment = bracketIncome * currentBracket.employeeRate;
            const employerPayment = bracketIncome * currentBracket.employerRate;
            
            totalEmployeePayment += employeePayment;
            totalEmployerPayment += employerPayment;
            remainingSalary -= bracketIncome;
            
            brackets.push({
                income: bracketIncome,
                employeeRate: currentBracket.employeeRate,
                employerRate: currentBracket.employerRate,
                employeePayment,
                employerPayment
            });
        }

        return {
            employee: Math.round(totalEmployeePayment),
            employer: Math.round(totalEmployerPayment),
            brackets
        };
    }

    calculateHealthInsurance(grossSalary) {
        let remainingSalary = grossSalary;
        let totalPayment = 0;
        const brackets = [];

        for (let i = 0; i < HEALTH_INSURANCE_BRACKETS_2025.length; i++) {
            const currentBracket = HEALTH_INSURANCE_BRACKETS_2025[i];
            const nextBracket = HEALTH_INSURANCE_BRACKETS_2025[i + 1];
            
            const bracketIncome = nextBracket 
                ? Math.min(remainingSalary, nextBracket.threshold - currentBracket.threshold)
                : remainingSalary;
            
            if (bracketIncome <= 0) break;
            
            const payment = bracketIncome * currentBracket.rate;
            totalPayment += payment;
            remainingSalary -= bracketIncome;
            
            brackets.push({
                income: bracketIncome,
                rate: currentBracket.rate,
                payment
            });
        }

        return {
            amount: Math.round(totalPayment),
            brackets
        };
    }

    calculatePensionAndSeverance(salary, rates) {
        const base = salary;
        return {
            employee: Math.round(base * (rates.employeePension / 100)),
            employer: Math.round(base * (rates.employerPension / 100)),
            base
        };
    }

    calculateEducationFund(salary, rates) {
        const base = salary;
        return {
            employee: Math.round(base * (rates.employeeEducationFund / 100)),
            employer: Math.round(base * (rates.employerEducationFund / 100)),
            base
        };
    }

    async generatePayslip(worker, input, db) {
        const { baseSalary, contributionRates = {} } = worker;
        const { workHours, vacationDays, sickDays, monthlyBonus, creditPoints, workingDays } = input;

        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();

        const numericBaseSalary = Number(baseSalary);
        const numericMonthlyBonus = Number(monthlyBonus || 0);
        const numericWorkingDays = Number(workingDays);
        
        const travelAllowance = Number(worker.travelAllowance || 0);
        const mealAllowance = Number(worker.mealAllowance || 0);
        const phoneAllowance = Number(worker.phoneAllowance || 0);
        const carAllowance = Number(worker.carAllowance || 0);
        const extraHoursBonus = Number(worker.extraHoursBonus || 0);
        const nonCompetitionBonus = Number(worker.nonCompetitionBonus || 0);
        const otherAllowances = Number(worker.otherAllowances || 0);

        const company = await this.getCompanyData(worker.companyCode || 'COMP001', db);

        const totalAllowances = 
            travelAllowance +
            mealAllowance +
            phoneAllowance +
            carAllowance +
            extraHoursBonus +
            nonCompetitionBonus +
            otherAllowances;

        const grossSalary = numericBaseSalary + totalAllowances + numericMonthlyBonus;

        const incomeTax = this.calculateIncomeTax(grossSalary, Number(creditPoints));
        const nationalInsurance = this.calculateNationalInsurance(grossSalary);
        const healthInsurance = this.calculateHealthInsurance(grossSalary);
        const pension = this.calculatePensionAndSeverance(numericBaseSalary, contributionRates);
        const educationFund = this.calculateEducationFund(numericBaseSalary, contributionRates);

        const dailyRate = numericBaseSalary / numericWorkingDays;
        const vacationDeduction = dailyRate * Number(vacationDays || 0);
        const sickDayDeduction = dailyRate * Number(sickDays || 0);

        // Calculate all components separately to avoid floating point issues
        const mandatoryDeductionsTotal = Math.round(
            (incomeTax.amount + nationalInsurance.employee + healthInsurance.amount) * 100
        ) / 100;

        const pensionDeductionsTotal = Math.round(
            (pension.employee + educationFund.employee) * 100
        ) / 100;

        const absenceDeductionsTotal = Math.round(
            (vacationDeduction + sickDayDeduction) * 100
        ) / 100;

        // Calculate total deductions as the sum of all deduction types
        const totalDeductionsAmount = Math.round(
            (mandatoryDeductionsTotal + pensionDeductionsTotal + absenceDeductionsTotal) * 100
        ) / 100;

        const employerCost = 
            grossSalary +
            nationalInsurance.employer +
            pension.employer +
            educationFund.employer;

        return {
            company: {
                name: company.name,
                address: company.address,
                city: company.city,
                taxFile: company.taxFile,
                id: company.companyId || company.id
            },
            payslip: {
                month: `${month}/${year}`,
                date: today.toLocaleDateString('he-IL')
            },
            employeeDetails: {
                firstName: worker.firstName,
                lastName: worker.lastName,
                fullName: `${worker.firstName} ${worker.lastName}`,
                role: worker.role,
                department: worker.department || 'לא צוין',
                personalId: worker.personalId,
                startDate: worker.startDate || today.toLocaleDateString('he-IL'),
                employeeNumber: worker.employeeNumber || worker.personalId,
                healthCare: worker.healthCare || 'לא צוין',
                maritalStatus: worker.maritalStatus || 'לא צוין',
                taxPoints: creditPoints
            },
            bank: {
                accountNumber: worker.bankAccount?.accountNumber || '',
                branch: worker.bankAccount?.branch || '',
                bankName: worker.bankAccount?.bankName || ''
            },
            payments: {
                baseSalary: numericBaseSalary.toFixed(2),
                travelExpenses: travelAllowance.toFixed(2),
                carValue: carAllowance.toFixed(2),
                phoneValue: phoneAllowance.toFixed(2),
                mealsValue: mealAllowance.toFixed(2),
                extraHoursBonus: extraHoursBonus.toFixed(2),
                nonCompetitionBonus: nonCompetitionBonus.toFixed(2),
                otherAllowances: otherAllowances.toFixed(2),
                monthlyBonus: numericMonthlyBonus.toFixed(2),
                totalPayments: grossSalary.toFixed(2)
            },
            additionalInfo: {
                workingDays: numericWorkingDays,
                workingHours: workHours
            },
            mandatoryDeductions: {
                incomeTax: incomeTax.amount.toFixed(2),
                nationalInsurance: nationalInsurance.employee.toFixed(2),
                healthTax: healthInsurance.amount.toFixed(2),
                total: mandatoryDeductionsTotal.toFixed(2)
            },
            pensionDeductions: {
                employeePension: pension.employee.toFixed(2),
                employerPension: pension.employer.toFixed(2),
                employerSeverance: (numericBaseSalary * (contributionRates.employerSeverance || 8.33) / 100).toFixed(2),
                employeeFund: educationFund.employee.toFixed(2),
                employerFund: educationFund.employer.toFixed(2),
                employeeDisability: "0.00",
                employerDisability: "0.00",
                totalEmployeeDeductions: pensionDeductionsTotal.toFixed(2),
                totalEmployerContributions: (pension.employer + educationFund.employer + 
                    (numericBaseSalary * (contributionRates.employerSeverance || 8.33) / 100)).toFixed(2)
            },
            cumulativePensionData: {
                fundName: worker.pensionFund?.name || 'לא צוין',
                fundType: worker.pensionFund?.type || 'קרן פנסיה',
                baseSalary: numericBaseSalary.toFixed(2),
                employeeDeduction: pension.employee.toFixed(2),
                employerContribution: pension.employer.toFixed(2),
                employerSeverance: (numericBaseSalary * (contributionRates.employerSeverance || 8.33) / 100).toFixed(2),
                employeePercentage: (contributionRates.employeePension || 6).toFixed(2),
                employerPercentage: (contributionRates.employerPension || 6.5).toFixed(2),
                severancePercentage: (contributionRates.employerSeverance || 8.33).toFixed(2)
            },
            absences: {
                vacation: {
                    yearly: "12",
                    previous: "0",
                    current: "1",
                    used: vacationDays || "0",
                    balance: "0"
                },
                sick: {
                    yearly: "18",
                    previous: "0",
                    current: "1.5",
                    used: sickDays || "0",
                    balance: "0"
                },
                recovery: {
                    yearly: "10",
                    previous: "0",
                    current: "0.83",
                    used: "0",
                    balance: "0.83"
                }
            },
            summary: {
                totalGross: grossSalary.toFixed(2),
                totalDeductions: totalDeductionsAmount.toFixed(2),
                totalNet: (grossSalary - totalDeductionsAmount).toFixed(2)
            }
        };
    }
}

module.exports = new PayslipCalculator(); 