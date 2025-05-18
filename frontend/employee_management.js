let currentEmployeeId = null;

function enableEdit() {
    document.querySelectorAll('#employeeCard input, #employeeCard textarea').forEach(el => {
        // Don't enable editing for sensitive fields
        if (!['id_number', 'bankName', 'bankBranch', 'bankAccount'].includes(el.id)) {
            el.disabled = false;
        }
    });
}

function disableFields() {
    document.querySelectorAll('#employeeCard input, #employeeCard textarea').forEach(el => el.disabled = true);
}

// Document Management Functions
function viewPreviousContracts() {
    viewDocuments('contracts');
}

function viewPayslips() {
    viewDocuments('payslips');
}

async function viewDocuments(type) {
    if (!currentEmployeeId) return;
    
    try {
        let endpoint;
        if (type === 'payslips') {
            endpoint = `${window.appConfig.apiBaseUrl}/api/payslips/${currentEmployeeId}`;
        } else {
            endpoint = `${window.appConfig.apiBaseUrl}/api/documents/${currentEmployeeId}/${type}`;
        }
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch documents');
        
        let documents = await response.json();
        
        // Transform payslips data to match the expected format
        if (type === 'payslips') {
            documents = documents.map(doc => ({
                _id: doc._id,
                title: `תלוש שכר - ${doc.payslip.month}`,
                date: doc.createdAt
            }));
        }
        
        // Create modal for document display
        const modalContent = document.createElement('div');
        modalContent.className = 'document-modal';
        
        if (documents.length === 0) {
            modalContent.innerHTML = '<p>לא נמצאו מסמכים</p>';
        } else {
            const documentsList = documents.map(doc => `
                <div class="document-item">
                    <div class="document-info">
                        <span class="document-title">${doc.title}</span>
                        <span class="document-date">${new Date(doc.date).toLocaleDateString('he-IL')}</span>
                    </div>
                    <div class="document-actions">
                        <button onclick="downloadDocument('${doc._id}', '${type}')" class="download-btn">
                            הורדה
                        </button>
                        <button onclick="viewDocumentPreview('${doc._id}', '${type}')" class="preview-btn">
                            תצוגה מקדימה
                        </button>
                    </div>
                </div>
            `).join('');
            
            modalContent.innerHTML = `
                <h3>${type === 'contracts' ? 'חוזי העסקה קודמים' : 'תלושי שכר'}</h3>
                <div class="documents-list">
                    ${documentsList}
                </div>
            `;
        }
        
        Swal.fire({
            html: modalContent,
            width: '600px',
            showConfirmButton: false,
            showCloseButton: true
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        Swal.fire({
            title: 'שגיאה!',
            text: 'אירעה שגיאה בטעינת המסמכים',
            icon: 'error'
        });
    }
}

async function downloadDocument(docId, type) {
    try {
        let endpoint;
        if (type === 'payslips') {
            endpoint = `${window.appConfig.apiBaseUrl}/api/payslips/${currentEmployeeId}/${docId}/download`;
        } else {
            endpoint = `${window.appConfig.apiBaseUrl}/api/documents/${currentEmployeeId}/${type}/${docId}/download`;
        }

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to download document');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = type === 'payslips' ? `payslip-${docId}.pdf` : `document-${docId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading document:', error);
        Swal.fire({
            title: 'שגיאה!',
            text: 'אירעה שגיאה בהורדת המסמך',
            icon: 'error'
        });
    }
}

async function viewDocumentPreview(docId, type) {
    try {
        let endpoint;
        if (type === 'payslips') {
            endpoint = `${window.appConfig.apiBaseUrl}/api/payslips/${currentEmployeeId}/${docId}/preview`;
        } else {
            endpoint = `${window.appConfig.apiBaseUrl}/api/documents/${currentEmployeeId}/${type}/${docId}/preview`;
        }

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch document preview');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        Swal.fire({
            html: `<iframe src="${url}" style="width: 100%; height: 70vh; border: none;"></iframe>`,
            width: '800px',
            showConfirmButton: false,
            showCloseButton: true,
            didClose: () => {
                window.URL.revokeObjectURL(url);
            }
        });
    } catch (error) {
        console.error('Error viewing document preview:', error);
        Swal.fire({
            title: 'שגיאה!',
            text: 'אירעה שגיאה בטעינת תצוגה מקדימה',
            icon: 'error'
        });
    }
}

async function viewCurrentContract() {
    if (!currentEmployeeId) return;
    
    try {
        const response = await fetch(`${window.appConfig.apiBaseUrl}/api/contracts/workers/${currentEmployeeId}/current-contract`);
        
        if (!response.ok) {
            if (response.status === 404) {
                // Show error message since contract should exist
                await Swal.fire({
                    title: 'שגיאה בטעינת החוזה',
                    text: 'לא ניתן לטעון את החוזה הנוכחי. אנא פנה למנהל המערכת.',
                    icon: 'error',
                    confirmButtonText: 'אישור'
                });
                return;
            }
            throw new Error('Failed to fetch current contract');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        Swal.fire({
            html: `<iframe src="${url}" style="width: 100%; height: 70vh; border: none;"></iframe>`,
            width: '800px',
            showConfirmButton: true,
            confirmButtonText: 'הורדה',
            showCloseButton: true,
            didClose: () => {
                window.URL.revokeObjectURL(url);
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const a = document.createElement('a');
                a.href = url;
                a.download = 'current-contract.pdf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        });
    } catch (error) {
        console.error('Error fetching current contract:', error);
        Swal.fire({
            title: 'שגיאה!',
            text: 'אירעה שגיאה בטעינת החוזה הנוכחי',
            icon: 'error'
        });
    }
}

async function generateNewContract() {
    try {
        const response = await fetch(`${window.appConfig.apiBaseUrl}/api/employees/${currentEmployeeId}/generate-contract`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to generate new contract');
        
        const result = await response.json();
        
        Swal.fire({
            title: 'החוזה נוצר בהצלחה!',
            text: 'החוזה החדש נוצר ונשמר במערכת',
            icon: 'success',
            showConfirmButton: true,
            confirmButtonText: 'צפה בחוזה',
        }).then((result) => {
            if (result.isConfirmed) {
                viewCurrentContract();
            }
        });
    } catch (error) {
        console.error('Error generating new contract:', error);
        Swal.fire({
            title: 'שגיאה!',
            text: 'אירעה שגיאה ביצירת החוזה החדש',
            icon: 'error'
        });
    }
}

async function loadEmployeesList() {
    console.log('Starting to load employees list...');
    try {
        console.log('Fetching from:', `${window.appConfig.apiBaseUrl}/api/workers`);
        const response = await fetch(`${window.appConfig.apiBaseUrl}/api/workers`);
        console.log('Response status:', response.status);
        if (!response.ok) throw new Error('Failed to fetch employees');
        
        const employees = await response.json();
        console.log('Fetched employees:', employees);
        
        const sidebarContainer = document.querySelector('.sidebar');
        const searchInput = sidebarContainer.querySelector('.search');
        while (searchInput.nextSibling) {
            searchInput.nextSibling.remove();
        }
        
        const departmentGroups = {};
        employees.forEach(emp => {
            const dept = emp.department || 'ללא מחלקה';
            if (!departmentGroups[dept]) {
                departmentGroups[dept] = [];
            }
            departmentGroups[dept].push(emp);
        });
        
        Object.entries(departmentGroups).forEach(([dept, empList]) => {
            const deptDiv = document.createElement('div');
            deptDiv.className = 'department';
            deptDiv.innerHTML = `<h4>${dept}</h4>`;
            
            empList.forEach(emp => {
                const empDiv = document.createElement('div');
                empDiv.className = 'employee-item';
                empDiv.innerHTML = `${emp.firstName} ${emp.lastName}`;
                empDiv.onclick = () => loadEmployeeData(emp._id);
                deptDiv.appendChild(empDiv);
            });
            
            sidebarContainer.appendChild(deptDiv);
        });
    } catch (error) {
        console.error('Detailed error loading employees:', error);
        Swal.fire({
            title: 'שגיאה!',
            text: 'אירעה שגיאה בטעינת רשימת העובדים',
            icon: 'error'
        });
    }
}

async function loadEmployeeData(employeeId) {
    console.log('Loading employee data for ID:', employeeId);
    try {
        console.log('Fetching from:', `${window.appConfig.apiBaseUrl}/api/workers/${employeeId}`);
        const response = await fetch(`${window.appConfig.apiBaseUrl}/api/workers/${employeeId}`);
        console.log('Response status:', response.status);
        if (!response.ok) throw new Error('Failed to fetch employee data');
        
        const employee = await response.json();
        console.log('Fetched employee data:', employee);
        currentEmployeeId = employeeId;
        
        document.getElementById('employeeCard').style.display = 'block';
        
        document.getElementById('full_name').value = `${employee.firstName} ${employee.lastName}`;
        document.getElementById('position').value = employee.role || '';
        document.getElementById('start_date').value = employee.startDate?.split('T')[0] || '';
        document.getElementById('email').value = employee.email || '';
        document.getElementById('phone').value = employee.phone || '';
        document.getElementById('id_number').value = employee.personalId || '';
        document.getElementById('address').value = employee.address || '';
        document.getElementById('department').value = employee.department || '';
        
        document.getElementById('base_salary').value = employee.baseSalary || '';
        document.getElementById('travel_allowance').value = employee.travelAllowance || '';
        document.getElementById('meal_allowance').value = employee.mealAllowance || '';
        document.getElementById('phone_allowance').value = employee.phoneAllowance || '';
        document.getElementById('car_allowance').value = employee.carAllowance || '';
        document.getElementById('extra_hours_bonus').value = employee.extraHoursBonus || '';
        document.getElementById('non_competition_bonus').value = employee.nonCompetitionBonus || '';
        document.getElementById('other_allowances').value = employee.otherAllowances || '';
        
        document.getElementById('employee_severance').value = employee.contributionRates?.employeeSeverance || '';
        document.getElementById('employer_severance').value = employee.contributionRates?.employerSeverance || '';
        document.getElementById('employee_pension').value = employee.contributionRates?.employeePension || '';
        document.getElementById('employer_pension').value = employee.contributionRates?.employerPension || '';
        document.getElementById('employee_education_fund').value = employee.contributionRates?.employeeEducationFund || '';
        document.getElementById('employer_education_fund').value = employee.contributionRates?.employerEducationFund || '';
        
        document.getElementById('max_annual_vection_days').value = employee.maxAnnualVectionDays || '';
        document.getElementById('max_annual_sick_days').value = employee.maxAnnualSickDays || '';
        document.getElementById('max_annual_convalescence_days').value = employee.maxAnnualConvalescenceDays || '';
        
        disableFields();
    } catch (error) {
        console.error('Detailed error loading employee data:', error);
        Swal.fire({
            title: 'שגיאה!',
            text: 'אירעה שגיאה בטעינת פרטי העובד',
            icon: 'error'
        });
    }
}

async function saveEmployeeData() {
    if (!currentEmployeeId) return;
    
    try {
        const [firstName, ...lastNameParts] = document.getElementById('full_name').value.split(' ');
        const formData = {
            firstName,
            lastName: lastNameParts.join(' '),
            role: document.getElementById('position').value,
            startDate: document.getElementById('start_date').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            personalId: document.getElementById('id_number').value,
            address: document.getElementById('address').value,
            department: document.getElementById('department').value,
            baseSalary: parseFloat(document.getElementById('base_salary').value) || 0,
            travelAllowance: parseFloat(document.getElementById('travel_allowance').value) || 0,
            mealAllowance: parseFloat(document.getElementById('meal_allowance').value) || 0,
            phoneAllowance: parseFloat(document.getElementById('phone_allowance').value) || 0,
            carAllowance: parseFloat(document.getElementById('car_allowance').value) || 0,
            extraHoursBonus: parseFloat(document.getElementById('extra_hours_bonus').value) || 0,
            nonCompetitionBonus: parseFloat(document.getElementById('non_competition_bonus').value) || 0,
            otherAllowances: parseFloat(document.getElementById('other_allowances').value) || 0,
            maxAnnualVectionDays: parseInt(document.getElementById('max_annual_vection_days').value) || 0,
            maxAnnualSickDays: parseInt(document.getElementById('max_annual_sick_days').value) || 0,
            maxAnnualConvalescenceDays: parseInt(document.getElementById('max_annual_convalescence_days').value) || 0,
            contributionRates: {
                employeeSeverance: parseFloat(document.getElementById('employee_severance').value) || 0,
                employerSeverance: parseFloat(document.getElementById('employer_severance').value) || 0,
                employeePension: parseFloat(document.getElementById('employee_pension').value) || 0,
                employerPension: parseFloat(document.getElementById('employer_pension').value) || 0,
                employeeEducationFund: parseFloat(document.getElementById('employee_education_fund').value) || 0,
                employerEducationFund: parseFloat(document.getElementById('employer_education_fund').value) || 0
            }
        };

        const response = await fetch(`${window.appConfig.apiBaseUrl}/api/workers/${currentEmployeeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Failed to update employee data');

        Swal.fire({
            title: 'הצלחה!',
            text: 'פרטי העובד עודכנו בהצלחה',
            icon: 'success'
        });

        await loadEmployeesList();
        await loadEmployeeData(currentEmployeeId);
    } catch (error) {
        console.error('Error saving employee data:', error);
        Swal.fire({
            title: 'שגיאה!',
            text: 'אירעה שגיאה בשמירת פרטי העובד',
            icon: 'error'
        });
    }
}

function setupEventListeners() {
    document.querySelector('.save-button').onclick = saveEmployeeData;

    // Document management buttons
    const contractsBtn = document.querySelector('.view-contracts-btn');
    if (contractsBtn) contractsBtn.onclick = viewPreviousContracts;

    const payslipsBtn = document.querySelector('.view-payslips-btn');
    if (payslipsBtn) payslipsBtn.onclick = viewPayslips;

    document.querySelector('.search input').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('.employee-item').forEach(item => {
            const name = item.textContent.toLowerCase();
            item.style.display = name.includes(searchTerm) ? 'block' : 'none';
        });
    });
}

// Initialize the app
function initializeApp() {
    if (!window.appConfig) {
        console.log('Waiting for config to load...');
        setTimeout(initializeApp, 1000);
        return;
    }
    console.log('Config loaded, initializing app...');
    setupEventListeners();
    loadEmployeesList();
}

// Start initialization when the DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export functions that need to be accessed from HTML
window.viewPreviousContracts = viewPreviousContracts;
window.viewPayslips = viewPayslips;
window.viewCurrentContract = viewCurrentContract;
window.downloadDocument = downloadDocument;
window.viewDocumentPreview = viewDocumentPreview;
window.generateNewContract = generateNewContract; 