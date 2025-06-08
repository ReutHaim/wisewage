const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

// Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await dashboardService.getDashboardStats(req);
        res.json(stats);
    } catch (error) {
        console.error('Error in dashboard stats route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get department days statistics
router.get('/department-days', async (req, res) => {
    try {
        const stats = await dashboardService.getDepartmentDaysStats(req);
        res.json(stats);
    } catch (error) {
        console.error('Error in department days route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get vacation trend statistics
router.get('/vacation-trend', async (req, res) => {
    try {
        const stats = await dashboardService.getVacationTrendStats(req);
        res.json(stats);
    } catch (error) {
        console.error('Error in vacation trend route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get vacation heatmap statistics
router.get('/vacation-heatmap', async (req, res) => {
    try {
        const stats = await dashboardService.getVacationHeatmapStats(req);
        res.json(stats);
    } catch (error) {
        console.error('Error in vacation heatmap route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get bonus statistics
router.get('/bonus-stats', async (req, res) => {
    try {
        const stats = await dashboardService.getBonusStats(req);
        res.json(stats);
    } catch (error) {
        console.error('Error in bonus stats route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get department bonus statistics
router.get('/department-bonus', async (req, res) => {
    try {
        const stats = await dashboardService.getDepartmentBonusStats(req);
        res.json(stats);
    } catch (error) {
        console.error('Error in department bonus route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get bonus trend statistics
router.get('/bonus-trend', async (req, res) => {
    try {
        const stats = await dashboardService.getBonusTrendStats(req);
        res.json(stats);
    } catch (error) {
        console.error('Error in bonus trend route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get top employees by bonus
router.get('/top-employees-bonus', async (req, res) => {
    try {
        const stats = await dashboardService.getTopEmployeesByBonus(req);
        res.json(stats);
    } catch (error) {
        console.error('Error in top employees bonus route:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router; 