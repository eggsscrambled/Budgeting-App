document.addEventListener('DOMContentLoaded', function () {
    // ----------------------------------------------------
    // Chart References for Re-rendering
    // ----------------------------------------------------
    var lineChartInstance = null;
    var doughnutChartInstance = null;

    // ----------------------------------------------------
    // Helper Color Generators
    // ----------------------------------------------------
    function getAccountColor(name) {
        var hash = 0;
        for (var i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        var h = Math.abs(hash) % 360;
        return 'hsl(' + h + ', 65%, 55%)';
    }

    function getCategoryColor(cat) {
        var colors = BudgetData.getCategoryColors();
        return colors[cat] || getAccountColor(cat);
    }

    // ----------------------------------------------------
    // Date Boundary Calculator
    // ----------------------------------------------------
    function getStartDateForFilter(filterValue) {
        var now = new Date();
        var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (filterValue === 'this-month') {
            start.setDate(1); // 1st of current month
            return start.toISOString().slice(0, 10);
        } else if (filterValue === 'last-30') {
            start.setDate(now.getDate() - 30);
            return start.toISOString().slice(0, 10);
        } else if (filterValue === 'last-90') {
            start.setDate(now.getDate() - 90);
            return start.toISOString().slice(0, 10);
        } else if (filterValue === 'this-year') {
            start.setMonth(0, 1); // Jan 1st of current year
            return start.toISOString().slice(0, 10);
        }
        return null; // All Time
    }

    // ----------------------------------------------------
    // Custom Daily Balance History Fallback & Generator
    // ----------------------------------------------------
    function getDailyBalanceHistory(daysCount) {
        var history = BudgetData.getBalanceHistory ? BudgetData.getBalanceHistory() : [];
        var currentTotal = BudgetData.getTotalBalance();
        var data = [];
        var labels = [];
        var now = new Date();

        for (var i = daysCount - 1; i >= 0; i--) {
            var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            var dateStr = d.toISOString().slice(0, 10);
            
            // Format label as "MMM DD" (e.g. "Jul 15")
            var labelStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            labels.push(labelStr);

            var balance = history.length > 0 ? history[0].balance : currentTotal;
            history.forEach(function (point) {
                if (point.date <= dateStr) {
                    balance = point.balance;
                }
            });
            data.push(Math.round(balance * 100) / 100);
        }
        return { labels: labels, data: data };
    }

    // ----------------------------------------------------
    // Rendering Sub-Systems
    // ----------------------------------------------------
    function renderLineChart(chartInfo) {
        var lineCanvas = document.getElementById('myChart');
        if (!lineCanvas) return;

        if (lineChartInstance) {
            lineChartInstance.destroy();
        }

        var ctx = lineCanvas.getContext('2d');
        var values = chartInfo.data.filter(function (v) { return v !== null; });
        var minVal = values.length ? Math.min.apply(null, values) : 0;
        var maxVal = values.length ? Math.max.apply(null, values) : 0;
        var padding = Math.max((maxVal - minVal) * 0.1, 100);

        lineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartInfo.labels,
                datasets: [{
                    label: 'Accounts Total',
                    data: chartInfo.data,
                    backgroundColor: 'rgba(108, 245, 119, 0.1)',
                    borderColor: 'rgb(58, 255, 100)',
                    pointBackgroundColor: 'rgb(58, 255, 100)',
                    pointHoverBackgroundColor: 'rgba(46, 46, 95, 0.57)',
                    borderWidth: 5,
                    fill: true,
                    tension: 0.3,
                    spanGaps: false
                }]
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
                        grid: {
                            color: 'rgba(255, 255, 255, 0.15)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'white',
                            autoSkip: true,
                            maxTicksLimit: 15
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
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
                                if (ctx.parsed.y === null) return 'Accounts Total: —';
                                return 'Accounts Total: $' + ctx.parsed.y.toLocaleString(undefined, {
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

    function renderDoughnutChart(catTotals, totalExpense) {
        var spendingCanvas = document.getElementById('spendingChart');
        var spendingEmpty = document.getElementById('spendingChartEmpty');

        if (doughnutChartInstance) {
            doughnutChartInstance.destroy();
            doughnutChartInstance = null;
        }

        if (totalExpense === 0) {
            if (spendingCanvas) spendingCanvas.style.display = 'none';
            if (spendingEmpty) {
                spendingEmpty.style.display = 'block';
                spendingEmpty.textContent = 'No expense logs in this time frame.';
            }
        } else {
            if (spendingEmpty) spendingEmpty.style.display = 'none';
            if (spendingCanvas) {
                spendingCanvas.style.display = 'block';
                var sCtx = spendingCanvas.getContext('2d');
                
                var labels = Object.keys(catTotals);
                var dataValues = labels.map(function (cat) { return Math.round(catTotals[cat] * 100) / 100; });
                var backgroundColors = labels.map(function (cat) { return getCategoryColor(cat); });

                doughnutChartInstance = new Chart(sCtx, {
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
                                    font: { family: 'Lexend', size: 18, weight: '400' }
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
        }
    }

    function renderAccountsList(accounts) {
        var accountsContainer = document.getElementById('overviewAccounts');
        if (!accountsContainer) return;

        accountsContainer.innerHTML = '';
        if (accounts.length === 0) {
            accountsContainer.innerHTML = '<div class="EmptyState">No active accounts. Create one under the "Add" tab to start.</div>';
        } else {
            accounts.forEach(function (acc) {
                var card = document.createElement('div');
                card.className = 'OverviewAccountCard';

                var leftDiv = document.createElement('div');
                leftDiv.className = 'AccountInfoLeft';

                var badge = document.createElement('div');
                badge.className = 'AccountBadge';
                badge.style.backgroundColor = acc.color || getAccountColor(acc.name);
                badge.textContent = acc.name.charAt(0).toUpperCase();

                var nameSpan = document.createElement('span');
                nameSpan.className = 'AccountNameText';
                nameSpan.textContent = acc.name;

                leftDiv.appendChild(badge);
                leftDiv.appendChild(nameSpan);

                var balSpan = document.createElement('span');
                balSpan.className = 'AccountBalanceText';
                if (acc.balance > 0) {
                    balSpan.classList.add('positive');
                } else if (acc.balance < 0) {
                    balSpan.classList.add('negative');
                } else {
                    balSpan.classList.add('neutral');
                }
                balSpan.textContent = BudgetData.formatCurrency(acc.balance);

                card.appendChild(leftDiv);
                card.appendChild(balSpan);
                accountsContainer.appendChild(card);
            });
        }
    }

    function renderCategoriesList(catTotals, totalExpense) {
        var categoriesContainer = document.getElementById('overviewCategories');
        if (!categoriesContainer) return;

        categoriesContainer.innerHTML = '';
        if (totalExpense === 0) {
            categoriesContainer.innerHTML = '<div class="EmptyState">No expense logs in this time frame.</div>';
        } else {
            var sortedCats = Object.keys(catTotals).map(function (cat) {
                return { name: cat, amount: catTotals[cat] };
            }).sort(function (a, b) {
                return b.amount - a.amount;
            });

            sortedCats.forEach(function (catItem) {
                var pct = (catItem.amount / totalExpense) * 100;

                var itemDiv = document.createElement('div');
                itemDiv.className = 'OverviewCategoryItem';

                var headerDiv = document.createElement('div');
                headerDiv.className = 'CategoryHeader';

                var nameSpan = document.createElement('span');
                nameSpan.className = 'CategoryName';
                nameSpan.textContent = catItem.name;

                var amtSpan = document.createElement('span');
                amtSpan.className = 'CategoryAmount';
                amtSpan.textContent = BudgetData.formatCurrency(catItem.amount) + ' (' + pct.toFixed(1) + '%)';

                headerDiv.appendChild(nameSpan);
                headerDiv.appendChild(amtSpan);

                var trackDiv = document.createElement('div');
                trackDiv.className = 'ProgressBarTrack';

                var fillDiv = document.createElement('div');
                fillDiv.className = 'ProgressBarFill';
                fillDiv.style.background = 'linear-gradient(90deg, ' + getCategoryColor(catItem.name) + 'aa, ' + getCategoryColor(catItem.name) + ')';
                fillDiv.dataset.width = pct + '%';

                trackDiv.appendChild(fillDiv);
                itemDiv.appendChild(headerDiv);
                itemDiv.appendChild(trackDiv);
                categoriesContainer.appendChild(itemDiv);
            });

            // Trigger animation
            setTimeout(function () {
                var fills = categoriesContainer.querySelectorAll('.ProgressBarFill');
                fills.forEach(function (fill) {
                    fill.style.width = fill.dataset.width;
                });
            }, 100);
        }
    }

    // ----------------------------------------------------
    // Master Update Driver
    // ----------------------------------------------------
    function updateDashboard(filterValue) {
        var txns = BudgetData.getTransactions();
        var accounts = BudgetData.getAccounts();
        var startDate = getStartDateForFilter(filterValue);

        // 1. Line Chart Setup
        var chartInfo;
        if (filterValue === 'this-month') {
            var now = new Date();
            chartInfo = getDailyBalanceHistory(now.getDate());
        } else if (filterValue === 'last-30') {
            chartInfo = getDailyBalanceHistory(30);
        } else if (filterValue === 'last-90') {
            chartInfo = getDailyBalanceHistory(90);
        } else {
            chartInfo = BudgetData.getMonthlyBalanceHistory();
        }
        renderLineChart(chartInfo);

        // 2. Filter Transactions for Expenses
        var filteredTxns = txns;
        if (startDate) {
            filteredTxns = txns.filter(function (t) {
                return t.date >= startDate;
            });
        }

        var expenses = filteredTxns.filter(function (t) { return t.type === 'expense'; });
        var catTotals = {};
        var totalExpense = 0;

        expenses.forEach(function (e) {
            catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
            totalExpense += e.amount;
        });

        // 3. Render Remaining Subsections
        renderDoughnutChart(catTotals, totalExpense);
        renderCategoriesList(catTotals, totalExpense);
        renderAccountsList(accounts);
    }

    // ----------------------------------------------------
    // Event Hookups & Initial Trigger
    // ----------------------------------------------------
    var filterSelect = document.getElementById('timeFrameFilter');
    if (filterSelect) {
        filterSelect.addEventListener('change', function (e) {
            updateDashboard(e.target.value);
        });
        updateDashboard(filterSelect.value);
    } else {
        updateDashboard('all');
    }
});
