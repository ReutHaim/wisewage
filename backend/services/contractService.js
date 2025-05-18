const fs = require('fs');
const path = require('path');

const documentsDir = path.join(__dirname, '..', 'documents');

// Ensure documents directory exists
if (!fs.existsSync(documentsDir)) {
    fs.mkdirSync(documentsDir);
}

async function saveContract(file, employee) {
    const filename = `contract_${employee._id}_${Date.now()}_${file.originalname}`;
    const filePath = path.join(documentsDir, filename);

    await fs.promises.rename(file.path, filePath);

    return {
        filename,
        originalName: file.originalname,
        path: filePath
    };
}

function getContractPath(filename) {
    return path.join(documentsDir, filename);
}

async function deleteContract(filename) {
    const filePath = getContractPath(filename);
    if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
    }
}

module.exports = {
    saveContract,
    getContractPath,
    deleteContract
}; 