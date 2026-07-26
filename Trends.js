document.addEventListener('DOMContentLoaded', function () {
    var chartInstance = null;

    function monthKey(dateStr) {
        return dateStr.slice(0, 7);
    }

    function monthLabel(key) {
        var parts = key.split('-');
        var d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }

    function addMonths(key, count) {
        var parts = key.split('-');
        var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + count, 1);
        var m = String(d.getMonth() + 1);
        if (m.length < 2) m = '0' + m;
        return d.getFullYear() + '-' + m;
    }

    function getMonthlyNetStats() {
        var txns = BudgetData.getTransactions().filter(function (t) {
            return t.type === 'income' || t.type === 'expense';
        });

        var byMonth = {};
        txns.forEach(function (t) {
            var key = monthKey(t.date);
            if (!byMonth[key]) byMonth[key] = { income: 0, expense: 0 };
            if (t.type === 'income') byMonth[key].income += t.amount;
            else byMonth[key].expense += t.amount;
        });

        var keys = Object.keys(byMonth).sort();
        return { byMonth: byMonth, keys: keys };
    }

    function getAverageMonthlyRates() {
        var stats = getMonthlyNetStats();
        var keys = stats.keys;
        if (keys.length === 0) {
            return { avgIncome: 0, avgExpense: 0, avgSaved: 0, months: 0, topCategory: null };
        }

        // Prefer last up to 6 months with activity for a more relevant projection
        var recent = keys.slice(-6);
        var income = 0;
        var expense = 0;
        recent.forEach(function (key) {
            income += stats.byMonth[key].income;
            expense += stats.byMonth[key].expense;
        });

        var months = recent.length;
        var avgIncome = income / months;
        var avgExpense = expense / months;
        var avgSaved = avgIncome - avgExpense;

        var catTotals = {};
        BudgetData.getTransactions().forEach(function (t) {
            if (t.type !== 'expense') return;
            if (recent.indexOf(monthKey(t.date)) === -1) return;
            catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
        });

        var topCategory = null;
        var topAmount = 0;
        Object.keys(catTotals).forEach(function (cat) {
            if (catTotals[cat] > topAmount) {
                topAmount = catTotals[cat];
                topCategory = cat;
            }
        });

        return {
            avgIncome: avgIncome,
            avgExpense: avgExpense,
            avgSaved: avgSaved,
            months: months,
            topCategory: topCategory
        };
    }

    function buildProjection(horizonMonths) {
        var history = BudgetData.getMonthlyBalanceHistory();
        var currentTotal = BudgetData.getTotalBalance();
        var rates = getAverageMonthlyRates();
        var now = new Date();
        var currentMonth = String(now.getMonth() + 1);
        if (currentMonth.length < 2) currentMonth = '0' + currentMonth;
        var currentKey = now.getFullYear() + '-' + currentMonth;

        var labels = [];
        var actual = [];
        var projected = [];

        // Past months from yearly history (only non-null)
        history.labels.forEach(function (label, idx) {
            if (history.data[idx] === null) return;
            labels.push(label.slice(0, 3));
            actual.push(history.data[idx]);
            projected.push(null);
        });

        // Ensure current point exists for projection join
        if (labels.length === 0) {
            labels.push(now.toLocaleDateString('en-US', { month: 'short' }));
            actual.push(currentTotal);
            projected.push(currentTotal);
        } else {
            // Last actual becomes projection start
            projected[projected.length - 1] = actual[actual.length - 1];
        }

        var running = currentTotal;
        for (var i = 1; i <= horizonMonths; i++) {
            var key = addMonths(currentKey, i);
            labels.push(monthLabel(key));
            actual.push(null);
            running += rates.avgSaved;
            projected.push(Math.round(running * 100) / 100);
        }

        return {
            labels: labels,
            actual: actual,
            projected: projected,
            estimated: running,
            rates: rates,
            currentTotal: currentTotal
        };
    }

    function renderChart(info) {
        var canvas = document.getElementById('trendsChart');
        if (!canvas) return;

        if (chartInstance) chartInstance.destroy();

        var values = info.actual.concat(info.projected).filter(function (v) { return v !== null; });
        var minVal = values.length ? Math.min.apply(null, values) : 0;
        var maxVal = values.length ? Math.max.apply(null, values) : 0;
        var padding = Math.max((maxVal - minVal) * 0.1, 100);

        chartInstance = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: info.labels,
                datasets: [
                    {
                        label: 'Actual Balance',
                        data: info.actual,
                        borderColor: 'rgb(58, 255, 100)',
                        backgroundColor: 'rgba(108, 245, 119, 0.08)',
                        pointBackgroundColor: 'rgb(58, 255, 100)',
                        borderWidth: 5,
                        fill: false,
                        tension: 0.3,
                        spanGaps: false
                    },
                    {
                        label: 'Estimated Value',
                        data: info.projected,
                        borderColor: 'rgb(106, 124, 255)',
                        backgroundColor: 'rgba(106, 124, 255, 0.12)',
                        pointBackgroundColor: 'rgb(106, 124, 255)',
                        borderWidth: 4,
                        borderDash: [10, 8],
                        fill: true,
                        tension: 0.3,
                        spanGaps: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: minVal === 0 && maxVal === 0,
                        suggestedMin: minVal === 0 && maxVal === 0 ? 0 : minVal - padding,
                        suggestedMax: maxVal + padding,
                        ticks: {
                            color: 'white',
                            callback: function (value) {
                                return '$' + value.toLocaleString();
                            }
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.15)' }
                    },
                    x: {
                        ticks: { color: 'white', autoSkip: true, maxTicksLimit: 16 },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white',
                            font: { family: 'Lexend', size: 14 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                if (ctx.parsed.y === null) return ctx.dataset.label + ': —';
                                return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                });
                            }
                        }
                    }
                }
            }
        });
    }

    function updateTrends(horizonMonths) {
        var info = buildProjection(horizonMonths);
        var change = info.estimated - info.currentTotal;
        var rates = info.rates;

        renderChart(info);

        document.getElementById('currentTotalValue').textContent = BudgetData.formatCurrency(info.currentTotal);
        document.getElementById('estimatedTotalValue').textContent = BudgetData.formatCurrency(info.estimated);

        var changeEl = document.getElementById('projectedChangeValue');
        changeEl.textContent = (change >= 0 ? '+' : '') + BudgetData.formatCurrency(change);
        changeEl.classList.toggle('positive', change >= 0);
        changeEl.classList.toggle('expense', change < 0);

        document.getElementById('avgMonthlyIncome').textContent = BudgetData.formatCurrency(rates.avgIncome);
        document.getElementById('avgMonthlySpend').textContent = BudgetData.formatCurrency(rates.avgExpense);
        document.getElementById('avgMonthlySaved').textContent = BudgetData.formatCurrency(rates.avgSaved);
        document.getElementById('monthsOfData').textContent = String(rates.months);

        var savingsRate = rates.avgIncome > 0 ? (rates.avgSaved / rates.avgIncome) * 100 : 0;
        var rateEl = document.getElementById('savingsRateValue');
        rateEl.textContent = rates.months > 0 ? savingsRate.toFixed(1) + '%' : '—';
        rateEl.classList.toggle('positive', savingsRate >= 0);
        rateEl.classList.toggle('expense', savingsRate < 0);

        var directionEl = document.getElementById('directionValue');
        if (rates.months === 0) {
            directionEl.textContent = 'Need more data';
            directionEl.className = 'SignalValue';
        } else if (rates.avgSaved > 0) {
            directionEl.textContent = 'Growing';
            directionEl.className = 'SignalValue positive';
        } else if (rates.avgSaved < 0) {
            directionEl.textContent = 'Shrinking';
            directionEl.className = 'SignalValue expense';
        } else {
            directionEl.textContent = 'Flat';
            directionEl.className = 'SignalValue';
        }

        document.getElementById('topCategoryValue').textContent = rates.topCategory || '—';

        var hint = document.getElementById('projectionHint');
        if (rates.months === 0) {
            hint.textContent = 'Add income and expense entries to estimate future account value.';
        } else {
            hint.textContent = 'Projection uses your average monthly savings over the last ' +
                rates.months + ' month' + (rates.months === 1 ? '' : 's') +
                ' (' + BudgetData.formatCurrency(rates.avgSaved) + '/mo).';
        }
    }

    var horizonSelect = document.getElementById('projectionHorizon');
    if (horizonSelect) {
        horizonSelect.addEventListener('change', function (e) {
            updateTrends(parseInt(e.target.value, 10) || 6);
        });
        updateTrends(parseInt(horizonSelect.value, 10) || 6);
    } else {
        updateTrends(6);
    }

    BudgetData.updateTotalDisplay();
});
