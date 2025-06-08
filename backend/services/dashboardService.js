const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const dbName = 'wisewage';

async function connect() {
    try {
        await client.connect();
        return client.db(dbName);
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
}

async function getDepartmentDaysStats(req) {
    try {
        const db = req.db;
        
        // Get vacation and sick days by department
        const departmentStats = await db.collection('workers').aggregate([
            {
                $group: {
                    _id: '$department',
                    vacationDays: { $sum: { $ifNull: ['$maxAnnualVectionDays', 0] } },
                    sickDays: { $sum: { $ifNull: ['$maxAnnualSickDays', 0] } }
                }
            },
            {
                $project: {
                    department: '$_id',
                    vacationDays: 1,
                    sickDays: 1,
                    _id: 0
                }
            }
        ]).toArray();

        return departmentStats;
    } catch (error) {
        console.error('Error getting department days stats:', error);
        throw error;
    }
}

async function getVacationTrendStats(req) {
    try {
        const db = req.db;
        
        // Get last 6 months of vacation data from payslips
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
        sixMonthsAgo.setUTCDate(1);
        sixMonthsAgo.setUTCHours(0, 0, 0, 0);
        
        const trendStats = await db.collection('payslips').aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    vacationDays: { $avg: { $ifNull: ['$absences.vacation.used', 0] } },
                    employeeCount: { $sum: 1 }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1
                }
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $concat: [
                            { $toString: '$_id.year' },
                            '-',
                            { $toString: '$_id.month' }
                        ]
                    },
                    vacationDays: { $round: ['$vacationDays', 1] }
                }
            }
        ]).toArray();

        return trendStats;
    } catch (error) {
        console.error('Error getting vacation trend stats:', error);
        throw error;
    }
}

async function getVacationHeatmapStats(req) {
    try {
        const db = req.db;
        
        // Get vacation data for the last 3 years by quarter from payslips
        const threeYearsAgo = new Date();
        threeYearsAgo.setUTCFullYear(threeYearsAgo.getUTCFullYear() - 3);
        threeYearsAgo.setUTCMonth(0);
        threeYearsAgo.setUTCDate(1);
        threeYearsAgo.setUTCHours(0, 0, 0, 0);
        
        const heatmapStats = await db.collection('payslips').aggregate([
            {
                $match: {
                    createdAt: { $gte: threeYearsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        quarter: {
                            $ceil: {
                                $divide: [{ $month: '$createdAt' }, 3]
                            }
                        }
                    },
                    vacationDays: { $sum: { $ifNull: ['$absences.vacation.used', 0] } }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.quarter': 1
                }
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    quarter: '$_id.quarter',
                    vacationDays: 1
                }
            }
        ]).toArray();

        return heatmapStats;
    } catch (error) {
        console.error('Error getting vacation heatmap stats:', error);
        throw error;
    }
}

async function getDashboardStats(req) {
    try {
        const db = req.db;
        
        // Get active employees count
        const activeEmployeesCount = await db.collection('workers').countDocuments({});
        
        // Get new employees this month
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setUTCDate(1);
        firstDayOfMonth.setUTCHours(0, 0, 0, 0);
        
        const newEmployeesCount = await db.collection('workers').countDocuments({
            createdAt: { $gte: firstDayOfMonth }
        });

        // Get total contracts
        const totalContracts = await db.collection('workers').countDocuments({
            contractPath: { $exists: true, $ne: "" }
        });

        // Get payslips generated this month
        const payslipsThisMonth = await db.collection('payslips').countDocuments({
            createdAt: { $gte: firstDayOfMonth }
        });

        // Calculate average gross salary
        const avgGrossSalary = await db.collection('payslips').aggregate([
            { 
                $match: { 
                    createdAt: { $gte: firstDayOfMonth },
                    'payments.totalPayments': { $exists: true }
                } 
            },
            { 
                $group: { 
                    _id: null, 
                    avgSalary: { 
                        $avg: { 
                            $toDouble: '$payments.totalPayments'
                        } 
                    } 
                } 
            }
        ]).toArray();

        // Calculate average net salary with proper deduction handling
        const avgNetSalary = await db.collection('payslips').aggregate([
            { 
                $match: { 
                    createdAt: { $gte: firstDayOfMonth },
                    'payments.totalPayments': { $exists: true },
                    'mandatoryDeductions.total': { $exists: true },
                    'pensionDeductions.totalEmployeeDeductions': { $exists: true }
                } 
            },
            {
                $project: {
                    gross: { $toDouble: '$payments.totalPayments' },
                    mandatoryDeductions: { $toDouble: '$mandatoryDeductions.total' },
                    pensionDeductions: { $toDouble: '$pensionDeductions.totalEmployeeDeductions' }
                }
            },
            {
                $project: {
                    netSalary: {
                        $subtract: [
                            '$gross',
                            { $add: ['$mandatoryDeductions', '$pensionDeductions'] }
                        ]
                    }
                }
            },
            { 
                $group: { 
                    _id: null, 
                    avgSalary: { $avg: '$netSalary' }
                } 
            }
        ]).toArray();

        // Get vacation and sick days statistics
        const vacationStats = await db.collection('payslips').aggregate([
            {
                $match: {
                    createdAt: { $gte: firstDayOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    avgVacationDays: { $avg: { $ifNull: ['$absences.vacation.used', 0] } },
                    totalSickDays: { $sum: { $ifNull: ['$absences.sick.used', 0] } }
                }
            }
        ]).toArray();

        // Get salary changes
        const salaryChanges = await db.collection('payslips').aggregate([
            {
                $sort: { createdAt: 1 }
            },
            {
                $group: {
                    _id: '$personalId',
                    salaries: { $push: { $toDouble: '$payments.totalPayments' } }
                }
            },
            {
                $project: {
                    changePercentage: {
                        $cond: {
                            if: { $gt: [{ $size: '$salaries' }, 1] },
                            then: {
                                $multiply: [
                                    {
                                        $divide: [
                                            { $subtract: [{ $arrayElemAt: ['$salaries', -1] }, { $arrayElemAt: ['$salaries', 0] }] },
                                            { $arrayElemAt: ['$salaries', 0] }
                                        ]
                                    },
                                    100
                                ]
                            },
                            else: 0
                        }
                    }
                }
            }
        ]).toArray();

        const significantIncreases = salaryChanges.filter(change => change.changePercentage > 20).length;
        const significantDecreases = salaryChanges.filter(change => change.changePercentage < -20).length;

        return {
            activeEmployeesCount,
            newEmployeesCount,
            contractsThisMonth: totalContracts,
            totalContracts,
            payslipsThisMonth,
            avgGrossSalary: Math.round(avgGrossSalary[0]?.avgSalary || 0),
            avgNetSalary: Math.round(avgNetSalary[0]?.avgSalary || 0),
            significantIncreases,
            significantDecreases,
            avgVacationDays: Math.round(vacationStats[0]?.avgVacationDays || 0),
            totalSickDays: Math.round(vacationStats[0]?.totalSickDays || 0)
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        throw error;
    }
}

async function getBonusStats(req) {
    try {
        const db = req.db;
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setUTCDate(1);
        firstDayOfMonth.setUTCHours(0, 0, 0, 0);

        // Get total bonuses paid this month
        const bonusStats = await db.collection('payslips').aggregate([
            {
                $match: {
                    createdAt: { $gte: firstDayOfMonth },
                    'payments.monthlyBonus': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBonus: { $sum: { $toDouble: '$payments.monthlyBonus' } },
                    employeeCount: { $sum: 1 },
                    avgBonus: { $avg: { $toDouble: '$payments.monthlyBonus' } }
                }
            }
        ]).toArray();

        // Get departments without bonuses
        const departmentsWithBonuses = await db.collection('payslips').distinct('employeeDetails.department', {
            createdAt: { $gte: firstDayOfMonth },
            'payments.monthlyBonus': { $gt: 0 }
        });

        const allDepartments = await db.collection('workers').distinct('department');
        const departmentsWithoutBonuses = allDepartments.filter(dept => !departmentsWithBonuses.includes(dept));

        // Calculate bonus growth percentage
        const lastMonth = new Date(firstDayOfMonth);
        lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);

        const lastMonthBonus = await db.collection('payslips').aggregate([
            {
                $match: {
                    createdAt: { $gte: lastMonth, $lt: firstDayOfMonth },
                    'payments.monthlyBonus': { $exists: true }
                }
            },
            {
                $group: {
                    _id: null,
                    totalBonus: { $sum: { $toDouble: '$payments.monthlyBonus' } }
                }
            }
        ]).toArray();

        const currentMonthBonus = bonusStats[0]?.totalBonus || 0;
        const previousMonthBonus = lastMonthBonus[0]?.totalBonus || 0;
        const bonusGrowthPercentage = previousMonthBonus > 0 
            ? ((currentMonthBonus - previousMonthBonus) / previousMonthBonus) * 100 
            : 0;

        return {
            totalBonus: Math.round(bonusStats[0]?.totalBonus || 0),
            employeesWithBonus: Math.round(bonusStats[0]?.employeeCount || 0),
            avgBonus: Math.round(bonusStats[0]?.avgBonus || 0),
            bonusGrowthPercentage: Math.round(bonusGrowthPercentage),
            departmentsWithoutBonuses: departmentsWithoutBonuses.length
        };
    } catch (error) {
        console.error('Error getting bonus stats:', error);
        throw error;
    }
}

async function getDepartmentBonusStats(req) {
    try {
        const db = req.db;
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setUTCDate(1);
        firstDayOfMonth.setUTCHours(0, 0, 0, 0);

        const departmentStats = await db.collection('payslips').aggregate([
            {
                $match: {
                    createdAt: { $gte: firstDayOfMonth },
                    'payments.monthlyBonus': { $exists: true }
                }
            },
            {
                $group: {
                    _id: '$employeeDetails.department',
                    totalBonus: { $sum: { $toDouble: '$payments.monthlyBonus' } }
                }
            },
            {
                $project: {
                    department: '$_id',
                    totalBonus: 1,
                    _id: 0
                }
            },
            {
                $sort: { totalBonus: -1 }
            }
        ]).toArray();

        return departmentStats;
    } catch (error) {
        console.error('Error getting department bonus stats:', error);
        throw error;
    }
}

async function getBonusTrendStats(req) {
    try {
        const db = req.db;
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);
        sixMonthsAgo.setUTCDate(1);
        sixMonthsAgo.setUTCHours(0, 0, 0, 0);

        const trendStats = await db.collection('payslips').aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo },
                    'payments.monthlyBonus': { $exists: true }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    totalBonus: { $sum: { $toDouble: '$payments.monthlyBonus' } }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    '_id.month': 1
                }
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $concat: [
                            { $toString: '$_id.year' },
                            '-',
                            { $toString: '$_id.month' }
                        ]
                    },
                    totalBonus: 1
                }
            }
        ]).toArray();

        return trendStats;
    } catch (error) {
        console.error('Error getting bonus trend stats:', error);
        throw error;
    }
}

async function getTopEmployeesByBonus(req) {
    try {
        const db = req.db;
        const firstDayOfMonth = new Date();
        firstDayOfMonth.setUTCDate(1);
        firstDayOfMonth.setUTCHours(0, 0, 0, 0);

        const nextDayOfMonth = new Date(firstDayOfMonth);
        nextDayOfMonth.setUTCMonth(nextDayOfMonth.getUTCMonth() + 1);

        console.log('Querying top employees by bonus for month starting:', firstDayOfMonth, 'and ending before:', nextDayOfMonth);

        const topEmployees = await db.collection('payslips').aggregate([
            {
                $match: {
                    createdAt: { $gte: firstDayOfMonth, $lt: nextDayOfMonth },
                    'payments.monthlyBonus': { $exists: true, $ne: "0.00" }
                }
            },
            {
                $group: {
                    _id: {
                        personalId: '$personalId',
                        fullName: '$employeeDetails.fullName',
                        department: '$employeeDetails.department'
                    },
                    totalBonus: { $sum: { $toDouble: '$payments.monthlyBonus' } }
                }
            },
            {
                $match: {
                    totalBonus: { $gt: 0 }
                }
            },
            {
                $sort: { totalBonus: -1 }
            },
            {
                $limit: 5
            },
            {
                $project: {
                    _id: 0,
                    fullName: '$_id.fullName',
                    department: '$_id.department',
                    totalBonus: 1
                }
            }
        ]).toArray();

        return topEmployees;
    } catch (error) {
        console.error('Error getting top employees by bonus:', error);
        throw error;
    }
}

module.exports = {
    getDashboardStats,
    getDepartmentDaysStats,
    getVacationTrendStats,
    getVacationHeatmapStats,
    getBonusStats,
    getDepartmentBonusStats,
    getBonusTrendStats,
    getTopEmployeesByBonus
}; 