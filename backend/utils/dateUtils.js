function formatDate(date) {
    return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

module.exports = {
    formatDate
}; 