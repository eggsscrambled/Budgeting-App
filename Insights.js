document.addEventListener('DOMContentLoaded', function () {
    var chartInstance = null;

    function getCategoryColor(cat) {
        var colors = BudgetData.getCategoryColors();
        if (colors[cat]) return colors[cat];
        var hash = 0;
        for (var i = 0; i < cat.length; i++) {
            hash = cat.charCodeAt(i) + ((hash << 5) - hash);
        }
        return 'hsl(' + (Math.abs(hash) % 360) + ', 65%, 55%)';
    }

    function getStartDateForFilter(filterValue) {
        var now = new Date();
        var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (filterValue === 'this-month') {
            start.setDate(1);
            return start.toISOString().slice(0, 10);
        }
        if (filterValue === 'last-30') {
            start.setDate(now.getDate() - 30);
            return start.toISOString().slice(0, 10);
        }
        if (filterValue === 'last-90') {
            start.setDate(now.getDate() - 90);
            return start.toISOString().slice(0, 10);
        }
        if (filterValue === 'this-year') {
            start.setMonth(0, 1);
            return start.toISOString().slice(0, 10);
        }
        return null;
    }

    function renderChart(catTotals, totalExpense) {
        var canvas = document.getElementById('insightsCategoryChart');
        var empty = document.getElementById('insightsChartEmpty');

        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }

        if (totalExpense <= 0) {
            if (canvas) canvas.style.display = 'none';
            if (empty) {
                empty.style.display = 'block';
                empty.textContent = 'No spending in this time frame.';
            }
            return;
        }

        if (empty) empty.style.display = 'none';
        if (!canvas) return;
        canvas.style.display = 'block';

        var labels = Object.keys(catTotals);
        var dataValues = labels.map(function (cat) { return Math.round(catTotals[cat] * 100) / 100; });
        var backgroundColors = labels.map(function (cat) { return getCategoryColor(cat); });

        chartInstance = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: dataValues,
                    backgroundColor: backgroundColors,
                    borderWidth: 2,
                    borderColor: '#282b53',
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#b0bdf7',
                            padding: 15,
                            font: { family: 'Lexend', size: 16, weight: '400' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                var val = ctx.parsed;
                                var pct = ((val / totalExpense) * 100).toFixed(1);
                                return ' ' + ctx.label + ': $' + val.toLocaleString() + ' (' + pct + '%)';
                            }
                        }
                    }
                },
                cutout: '65%'
            }
        });
    }

    function renderCategoryList(catTotals, totalIncome) {
        var container = document.getElementById('insightsCategoryList');
        if (!container) return;

        container.innerHTML = '';
        var names = Object.keys(catTotals);

        if (names.length === 0 || totalIncome <= 0) {
            container.innerHTML = '<div class="EmptyState">' +
                (totalIncome <= 0
                    ? 'Log income in this time frame to see category percentages.'
                    : 'No expense categories in this time frame.') +
                '</div>';
            return;
        }

        names.sort(function (a, b) { return catTotals[b] - catTotals[a]; });

        names.forEach(function (cat) {
            var amount = catTotals[cat];
            var pctOfIncome = (amount / totalIncome) * 100;
            var color = getCategoryColor(cat);

            var item = document.createElement('div');
            item.className = 'OverviewCategoryItem';

            var header = document.createElement('div');
            header.className = 'CategoryHeader';

            var name = document.createElement('span');
            name.className = 'CategoryName';
            name.textContent = cat;

            var amt = document.createElement('span');
            amt.className = 'CategoryAmount';
            amt.textContent = pctOfIncome.toFixed(1) + '% · ' + BudgetData.formatCurrency(amount);

            header.appendChild(name);
            header.appendChild(amt);

            var track = document.createElement('div');
            track.className = 'ProgressBarTrack';
            var fill = document.createElement('div');
            fill.className = 'ProgressBarFill';
            fill.style.background = 'linear-gradient(90deg, ' + color + 'aa, ' + color + ')';
            fill.dataset.width = Math.min(pctOfIncome, 100) + '%';
            track.appendChild(fill);

            item.appendChild(header);
            item.appendChild(track);
            container.appendChild(item);
        });

        setTimeout(function () {
            container.querySelectorAll('.ProgressBarFill').forEach(function (fill) {
                fill.style.width = fill.dataset.width;
            });
        }, 50);
    }

    function updateInsights(filterValue) {
        var startDate = getStartDateForFilter(filterValue);
        var txns = BudgetData.getTransactions();
        if (startDate) {
            txns = txns.filter(function (t) { return t.date >= startDate; });
        }

        var incomeTxns = txns.filter(function (t) { return t.type === 'income'; });
        var expenseTxns = txns.filter(function (t) { return t.type === 'expense'; });

        var totalIncome = incomeTxns.reduce(function (sum, t) { return sum + t.amount; }, 0);
        var totalSpent = expenseTxns.reduce(function (sum, t) { return sum + t.amount; }, 0);
        var saved = totalIncome - totalSpent;

        var savedPct = totalIncome > 0 ? (saved / totalIncome) * 100 : 0;
        var spentPct = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

        document.getElementById('totalIncomeValue').textContent = BudgetData.formatCurrency(totalIncome);
        document.getElementById('savedValue').textContent = BudgetData.formatCurrency(saved);
        document.getElementById('spentValue').textContent = BudgetData.formatCurrency(totalSpent);
        document.getElementById('savedPct').textContent = (totalIncome > 0 ? savedPct.toFixed(1) : '0') + '% of income';
        document.getElementById('spentPct').textContent = (totalIncome > 0 ? spentPct.toFixed(1) : '0') + '% of income';
        document.getElementById('savedBarPct').textContent = (totalIncome > 0 ? savedPct.toFixed(0) : '0') + '%';
        document.getElementById('spentBarPct').textContent = (totalIncome > 0 ? spentPct.toFixed(0) : '0') + '%';

        setTimeout(function () {
            document.getElementById('savedBar').style.width = Math.max(0, Math.min(savedPct, 100)) + '%';
            document.getElementById('spentBar').style.width = Math.max(0, Math.min(spentPct, 100)) + '%';
        }, 50);

        var catTotals = {};
        expenseTxns.forEach(function (t) {
            catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
        });

        renderChart(catTotals, totalSpent);
        renderCategoryList(catTotals, totalIncome);

        document.getElementById('incomeCount').textContent = String(incomeTxns.length);
        document.getElementById('expenseCount').textContent = String(expenseTxns.length);
        document.getElementById('categoryCount').textContent = String(Object.keys(catTotals).length);
        document.getElementById('avgExpense').textContent = BudgetData.formatCurrency(
            expenseTxns.length ? totalSpent / expenseTxns.length : 0
        );
    }

    var filterSelect = document.getElementById('insightsTimeFrame');
    if (filterSelect) {
        filterSelect.addEventListener('change', function (e) {
            updateInsights(e.target.value);
        });
        updateInsights(filterSelect.value);
    } else {
        updateInsights('this-month');
    }

    BudgetData.updateTotalDisplay();
});
