// Helper function to get API URL based on environment
function getApiUrl(endpoint) {
    return window.location.hostname === 'vmedu421.mtacloud.co.il'
        ? `/api/dashboard/${endpoint}`  // Use relative path in production
        : `http://localhost:3000/api/dashboard/${endpoint}`;
}

// Function to format currency values
function formatCurrency(value) {
    return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency: 'ILS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

// Function to format percentage values
function formatPercentage(value) {
    return `${value}%`;
}

// Function to update statistics cards
async function updateStatisticsCards() {
    try {
        const response = await fetch(getApiUrl('stats'));
        if (!response.ok) throw new Error('Failed to fetch dashboard stats');
        const data = await response.json();

        // Update all stat cards with real data
        document.querySelectorAll('.stat-card').forEach(card => {
            const title = card.querySelector('.stat-title').textContent;
            const valueElement = card.querySelector('.stat-value');
            const changeElement = card.querySelector('.stat-change');


            switch (title) {
                case 'מספר עובדים פעילים':
                    valueElement.textContent = data.activeEmployeesCount.toLocaleString();
                    break;
                case 'עובדים חדשים החודש':
                    valueElement.textContent = data.newEmployeesCount.toLocaleString();
                    break;
                case 'חוזים שהועלו החודש':
                    valueElement.textContent = data.contractsThisMonth.toLocaleString();
                    break;
                case 'סה"כ חוזים במערכת':
                    valueElement.textContent = data.totalContracts.toLocaleString();
                    break;
                case 'תלושים שנוצרו החודש':
                    valueElement.textContent = data.payslipsThisMonth.toLocaleString();
                    break;
                case 'ממוצע שכר ברוטו':
                    valueElement.textContent = formatCurrency(data.avgGrossSalary);
                    break;
                case 'ממוצע שכר נטו':
                    valueElement.textContent = formatCurrency(data.avgNetSalary);
                    break;
                case 'עובדים עם עליית שכר >20%':
                    valueElement.textContent = data.significantIncreases.toLocaleString();
                    break;
                case 'עובדים עם ירידת שכר >20%':
                    valueElement.textContent = data.significantDecreases.toLocaleString();
                    break;
                case 'ממוצע ימי חופשה החודש':
                    valueElement.textContent = data.avgVacationDays.toFixed(1);
                    break;
                case 'סה"כ ימי מחלה':
                    valueElement.textContent = data.totalSickDays.toLocaleString();
                    break;
            }
        });
    } catch (error) {
        console.error('Error updating statistics cards:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני הסטטיסטיקה', 'error');
    }
}

// Function to update department days chart
async function updateDepartmentDaysChart() {
    try {
        const response = await fetch(getApiUrl('department-days'));
        if (!response.ok) throw new Error('Failed to fetch department days data');
        const data = await response.json();

        const departments = data.map(item => item.department);
        const vacationDays = data.map(item => item.vacationDays);
        const sickDays = data.map(item => item.sickDays);

        const ctx = document.getElementById('departmentDaysChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: departments,
                datasets: [{
                    label: 'ימי חופשה',
                    data: vacationDays,
                    backgroundColor: 'rgba(52, 152, 219, 0.8)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }, {
                    label: 'ימי מחלה',
                    data: sickDays,
                    backgroundColor: 'rgba(231, 76, 60, 0.8)',
                    borderColor: 'rgba(231, 76, 60, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating department days chart:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני ימי חופשה ומחלה', 'error');
    }
}

// Function to update vacation trend chart
async function updateVacationTrendChart() {
    try {
        const response = await fetch(getApiUrl('vacation-trend'));
        if (!response.ok) throw new Error('Failed to fetch vacation trend data');
        const data = await response.json();

        const months = data.map(item => item.month);
        const vacationDays = data.map(item => item.vacationDays);

        const ctx = document.getElementById('vacationTrendChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'ממוצע ימי חופשה',
                    data: vacationDays,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        title: {
                            display: true,
                            text: 'ממוצע ימי חופשה'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating vacation trend chart:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני מגמת חופשות', 'error');
    }
}

// Function to update vacation heatmap chart
async function updateVacationHeatmapChart() {
    try {
        const response = await fetch(getApiUrl('vacation-heatmap'));
        if (!response.ok) throw new Error('Failed to fetch vacation heatmap data');
        const data = await response.json();

        const years = [...new Set(data.map(item => item.year))].sort();
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const datasets = [];

        for (const year of years) {
            const yearData = quarters.map(q => {
                const quarterNum = parseInt(q.replace('Q', ''));
                const entry = data.find(item => item.year === year && item.quarter === quarterNum);
                return entry ? entry.vacationDays : 0;
            });
            datasets.push({
                label: `שנת ${year}`,
                data: yearData,
                backgroundColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`,
                borderColor: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`,
                borderWidth: 1
            });
        }

        const ctx = document.getElementById('vacationHeatmapChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: quarters,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'ימי חופשה'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'רבעון'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating vacation heatmap chart:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני מפת חום חופשות', 'error');
    }
}

// Function to update bonus statistics
async function updateBonusStats() {
    try {
        const response = await fetch(getApiUrl('bonus-stats'));
        if (!response.ok) throw new Error('Failed to fetch bonus stats');
        const data = await response.json();

        // Update bonus stat cards
        document.querySelectorAll('.stat-card').forEach(card => {
            const title = card.querySelector('.stat-title').textContent;
            const valueElement = card.querySelector('.stat-value');
            const changeElement = card.querySelector('.stat-change');

            switch (title) {
                case 'סה"כ בונוסים ששולמו החודש':
                    valueElement.textContent = formatCurrency(data.totalBonus);
                    break;
                case 'עובדים שקיבלו בונוס':
                    valueElement.textContent = data.employeesWithBonus.toLocaleString();
                    break;
                case 'ממוצע בונוס לעובד':
                    valueElement.textContent = formatCurrency(data.avgBonus);
                    break;
                case 'אחוז גידול בבונוסים':
                    valueElement.textContent = formatPercentage(data.bonusGrowthPercentage);
                    break;
                case 'מחלקות ללא בונוסים':
                    valueElement.textContent = data.departmentsWithoutBonuses.toLocaleString();
                    break;
            }
        });
    } catch (error) {
        console.error('Error updating bonus stats:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני הבונוסים', 'error');
    }
}

// Function to update department bonus chart
async function updateDepartmentBonusChart() {
    try {
        const response = await fetch(getApiUrl('department-bonus'));
        if (!response.ok) throw new Error('Failed to fetch department bonus data');
        const data = await response.json();

        const departments = data.map(item => item.department);
        const bonuses = data.map(item => item.totalBonus);

        const ctx = document.getElementById('departmentBonusChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: departments,
                datasets: [{
                    label: 'סכום בונוסים',
                    data: bonuses,
                    backgroundColor: 'rgba(46, 204, 113, 0.8)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating department bonus chart:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני בונוסים לפי מחלקה', 'error');
    }
}

// Function to update bonus trend chart
async function updateBonusTrendChart() {
    try {
        const response = await fetch(getApiUrl('bonus-trend'));
        if (!response.ok) throw new Error('Failed to fetch bonus trend data');
        const data = await response.json();

        const months = data.map(item => item.month);
        const bonuses = data.map(item => item.totalBonus);

        const ctx = document.getElementById('bonusTrendChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'סכום בונוסים',
                    data: bonuses,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating bonus trend chart:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני מגמת בונוסים', 'error');
    }
}

// Function to update top employees by bonus
async function updateTopEmployeesByBonus() {
    try {
        const response = await fetch(getApiUrl('top-employees-bonus'));
        if (!response.ok) throw new Error('Failed to fetch top employees bonus data');
        const data = await response.json();

        const container = document.querySelector('.recent-activity');
        container.innerHTML = ''; // Clear previous content

        data.forEach((employee, index) => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon" style="background: linear-gradient(135deg, #f1c40f, #f39c12);">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${employee.fullName} - ${employee.department}</div>
                    <div class="activity-time">${formatCurrency(employee.totalBonus)}</div>
                </div>
            `;
            container.appendChild(activityItem);
        });
    } catch (error) {
        console.error('Error updating top employees by bonus:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת נתוני העובדים המובילים', 'error');
    }
}

// Initialize all dashboard components when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await Promise.all([
            updateStatisticsCards(),
            updateDepartmentDaysChart(),
            updateVacationTrendChart(),
            updateVacationHeatmapChart(),
            updateBonusStats(),
            updateDepartmentBonusChart(),
            updateBonusTrendChart(),
            updateTopEmployeesByBonus()
        ]);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        Swal.fire('שגיאה', 'אירעה שגיאה בעת טעינת הדשבורד', 'error');
    }
});

// Update dashboard data every 5 minutes
setInterval(async () => {
    try {
        await Promise.all([
            updateStatisticsCards(),
            updateBonusStats(),
            updateTopEmployeesByBonus(),
            updateVacationHeatmapChart()
        ]);
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}, 300000); // 5 minutes 