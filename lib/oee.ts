// OEE Calculation Engine

export interface OEEComponents {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
}

export interface EconomicLosses {
    stoppageLoss: number;
    productionLoss: number;
    defectLoss: number;
    totalLoss: number;
    potentialGain: number;
}

/**
 * Calculate OEE components
 * @param operativeTime - actual running time in minutes
 * @param plannedTime - planned production time in minutes
 * @param totalProduction - total units produced
 * @param defects - defective units
 * @param idealSpeed - ideal speed in units/minute
 */
export function calculateOEE(
    operativeTime: number,
    plannedTime: number,
    totalProduction: number,
    defects: number,
    idealSpeed: number,
    stopDuration: number = 0
): OEEComponents {
    // Availability = Operative Time / Planned Time
    const availability = plannedTime > 0 ? Math.min(operativeTime / plannedTime, 1) : 0;

    // Ideal production = ideal speed × operative time
    const idealProduction = idealSpeed * operativeTime;

    // Performance = Total Production / Ideal Production
    const performance = idealProduction > 0 ? Math.min(totalProduction / idealProduction, 1) : 0;

    // Quality = Good Units / Total Production
    const goodUnits = totalProduction - defects;
    const quality = totalProduction > 0 ? Math.min(goodUnits / totalProduction, 1) : 0;

    // OEE = Availability × Performance × Quality
    const oee = availability * performance * quality;

    return {
        availability: Math.max(0, availability),
        performance: Math.max(0, performance),
        quality: Math.max(0, quality),
        oee: Math.max(0, oee),
    };
}

/**
 * Classify OEE level
 */
export function getOEELevel(oee: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
    if (oee >= 0.85) return 'excellent';
    if (oee >= 0.70) return 'good';
    if (oee >= 0.50) return 'acceptable';
    return 'poor';
}

export function getOEEColor(oee: number): string {
    const level = getOEELevel(oee);
    switch (level) {
        case 'excellent': return '#00ff9d';
        case 'good': return '#00d4ff';
        case 'acceptable': return '#ffb800';
        case 'poor': return '#ff4757';
    }
}

/**
 * Calculate economic losses
 */
export function calculateEconomicLosses(
    stopDuration: number,        // total stop minutes
    defects: number,             // defective units
    totalProduction: number,     // actual production
    plannedTime: number,         // planned production time
    idealSpeed: number,          // units per minute
    stopCostPerMin: number,
    defectCostPerUnit: number,
    productionValuePerUnit: number,
    oeeGoal: number = 0.85
): EconomicLosses {
    // Loss from stoppages
    const stoppageLoss = stopDuration * stopCostPerMin;

    // Loss from low production (compared to ideal)
    const idealProduction = idealSpeed * plannedTime;
    const lostProduction = Math.max(0, idealProduction - totalProduction);
    const productionLoss = lostProduction * productionValuePerUnit;

    // Loss from defects
    const defectLoss = defects * defectCostPerUnit;

    const totalLoss = stoppageLoss + productionLoss + defectLoss;

    // Potential gain (if OEE target is met)
    const targetProduction = idealProduction * oeeGoal;
    const goodUnits = totalProduction - defects;
    const potentialGain = Math.max(0, targetProduction - goodUnits) * productionValuePerUnit;

    return {
        stoppageLoss,
        productionLoss,
        defectLoss,
        totalLoss,
        potentialGain,
    };
}

export function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
    }).format(value);
}
