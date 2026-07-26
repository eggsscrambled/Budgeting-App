document.addEventListener('DOMContentLoaded', function () {
    var monthlySavingsInput = document.getElementById('monthlySavingsInput');
    var saveSavingsGoalBtn = document.getElementById('saveSavingsGoalBtn');
    var budgetCategorySelect = document.getElementById('budgetCategorySelect');
    var budgetAmountInput = document.getElementById('budgetAmountInput');
    var addBudgetBtn = document.getElementById('addBudgetBtn');
    var categoryBudgetList = document.getElementById('categoryBudgetList');
    var goalsMonthLabel = document.getElementById('goalsMonthLabel');

    function getCategoryColor(cat) {
        var colors = BudgetData.getCategoryColors();
        if (colors[cat]) return colors[cat];
        var hash = 0;
        for (var i = 0; i < cat.length; i++) {
            hash = cat.charCodeAt(i) + ((hash << 5) - hash);
        }
        return 'hsl(' + (Math.abs(hash) % 360) + ', 65%, 55%)';
    }

    function getThisMonthStats() {
        var bounds = BudgetData.getMonthBounds();
        var txns = BudgetData.getTransactionsInRange(bounds.start, bounds.end);
        var income = 0;
        var spent = 0;
        var byCategory = {};

        txns.forEach(function (t) {
            if (t.type === 'income') {
                income += t.amount;
            } else if (t.type === 'expense') {
                spent += t.amount;
                byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
            }
        });

        return { income: income, spent: spent, byCategory: byCategory, bounds: bounds };
    }

    function populateCategorySelect() {
        var cats = BudgetData.getCategories().expense || [];
        var goals = BudgetData.getGoals();
        var budgets = goals.categoryBudgets || {};
        var selected = budgetCategorySelect.value;

        budgetCategorySelect.innerHTML = '';

        var available = cats.filter(function (c) { return budgets[c] === undefined; });

        if (available.length === 0) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = cats.length === 0
                ? 'Create expense categories in Add'
                : 'All categories already have budgets';
            budgetCategorySelect.appendChild(empty);
            budgetCategorySelect.disabled = true;
            addBudgetBtn.disabled = true;
            return;
        }

        budgetCategorySelect.disabled = false;
        addBudgetBtn.disabled = false;

        available.forEach(function (cat) {
            var opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            budgetCategorySelect.appendChild(opt);
        });

        if (selected && available.indexOf(selected) !== -1) {
            budgetCategorySelect.value = selected;
        }
    }

    function renderSummary() {
        var goals = BudgetData.getGoals();
        var stats = getThisMonthStats();
        var savingsGoal = goals.monthlySavings || 0;
        var available = Math.max(stats.income - savingsGoal, 0);
        var left = available - stats.spent;
        var usedPct = available > 0 ? Math.min((stats.spent / available) * 100, 100) : (stats.spent > 0 ? 100 : 0);

        monthlySavingsInput.value = savingsGoal > 0 ? savingsGoal : '';

        document.getElementById('incomeThisMonth').textContent = BudgetData.formatCurrency(stats.income);
        document.getElementById('savingsGoalDisplay').textContent = BudgetData.formatCurrency(savingsGoal);
        document.getElementById('availableToSpend').textContent = BudgetData.formatCurrency(available);
        document.getElementById('spentSoFar').textContent = BudgetData.formatCurrency(stats.spent);

        var leftEl = document.getElementById('leftToSpend');
        leftEl.textContent = BudgetData.formatCurrency(left);
        leftEl.classList.toggle('over', left < 0);

        var big = document.getElementById('overallRemainingBig');
        big.textContent = BudgetData.formatCurrency(left);
        big.classList.toggle('over', left < 0);

        var fill = document.getElementById('overallSpendFill');
        fill.classList.remove('warn', 'over');
        if (usedPct >= 100) fill.classList.add('over');
        else if (usedPct >= 80) fill.classList.add('warn');

        setTimeout(function () {
            fill.style.width = usedPct + '%';
        }, 50);

        document.getElementById('overallSpendMeta').textContent =
            usedPct.toFixed(0) + '% of available budget used';

        var hint = document.getElementById('overallHint');
        if (stats.income <= 0) {
            hint.textContent = 'Log income this month to calculate how much you can spend while still hitting your savings goal.';
        } else if (savingsGoal <= 0) {
            hint.textContent = 'Set a savings goal above to see your remaining spend allowance.';
        } else if (left < 0) {
            hint.textContent = 'You are over budget — reduce spending or lower your savings goal to get back on track.';
        } else {
            hint.textContent = 'Spend up to this amount and you can still save ' + BudgetData.formatCurrency(savingsGoal) + ' this month.';
        }

        if (goalsMonthLabel) {
            var now = new Date();
            goalsMonthLabel.textContent = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
    }

    function renderCategoryBudgets() {
        var goals = BudgetData.getGoals();
        var budgets = goals.categoryBudgets || {};
        var stats = getThisMonthStats();
        var names = Object.keys(budgets);

        categoryBudgetList.innerHTML = '';

        if (names.length === 0) {
            categoryBudgetList.innerHTML = '<div class="EmptyState">No category budgets yet — pick a category and set a monthly limit.</div>';
            return;
        }

        names.sort(function (a, b) {
            return (budgets[b] || 0) - (budgets[a] || 0);
        });

        names.forEach(function (cat) {
            var budget = budgets[cat] || 0;
            var spent = stats.byCategory[cat] || 0;
            var remaining = budget - spent;
            var pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : (spent > 0 ? 100 : 0);
            var color = getCategoryColor(cat);

            var item = document.createElement('div');
            item.className = 'BudgetItem';

            var header = document.createElement('div');
            header.className = 'BudgetItemHeader';

            var left = document.createElement('div');
            var name = document.createElement('span');
            name.className = 'BudgetCatName';
            name.textContent = cat;

            var amounts = document.createElement('div');
            amounts.className = 'BudgetAmounts';
            amounts.textContent = BudgetData.formatCurrency(spent) + ' / ' + BudgetData.formatCurrency(budget);

            left.appendChild(name);
            left.appendChild(amounts);

            var del = document.createElement('button');
            del.type = 'button';
            del.className = 'DeleteBudgetBtn';
            del.textContent = '×';
            del.title = 'Remove budget';
            del.addEventListener('click', function () {
                BudgetData.removeCategoryBudget(cat);
                refresh();
            });

            header.appendChild(left);
            header.appendChild(del);

            var track = document.createElement('div');
            track.className = 'ProgressBarTrack';
            var fill = document.createElement('div');
            fill.className = 'ProgressBarFill';
            if (pct >= 100) fill.classList.add('over');
            else if (pct >= 80) fill.classList.add('warn');
            fill.style.background = 'linear-gradient(90deg, ' + color + 'aa, ' + color + ')';
            fill.dataset.width = pct + '%';
            track.appendChild(fill);

            var meta = document.createElement('div');
            meta.className = 'BudgetMetaRow';
            meta.innerHTML = '<span>' + pct.toFixed(0) + '% used</span><span>' +
                (remaining >= 0 ? BudgetData.formatCurrency(remaining) + ' left' : BudgetData.formatCurrency(Math.abs(remaining)) + ' over') +
                '</span>';

            item.appendChild(header);
            item.appendChild(track);
            item.appendChild(meta);
            categoryBudgetList.appendChild(item);
        });

        setTimeout(function () {
            categoryBudgetList.querySelectorAll('.ProgressBarFill').forEach(function (fill) {
                fill.style.width = fill.dataset.width;
            });
        }, 50);
    }

    function refresh() {
        populateCategorySelect();
        renderSummary();
        renderCategoryBudgets();
        BudgetData.updateTotalDisplay();
    }

    saveSavingsGoalBtn.addEventListener('click', function () {
        BudgetData.setMonthlySavingsGoal(parseFloat(monthlySavingsInput.value) || 0);
        refresh();
    });

    monthlySavingsInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') saveSavingsGoalBtn.click();
    });

    addBudgetBtn.addEventListener('click', function () {
        var cat = budgetCategorySelect.value;
        var amount = parseFloat(budgetAmountInput.value);
        if (!cat || !amount || amount <= 0) {
            alert('Choose a category and enter a budget greater than 0.');
            return;
        }
        BudgetData.setCategoryBudget(cat, amount);
        budgetAmountInput.value = '';
        refresh();
    });

    budgetAmountInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') addBudgetBtn.click();
    });

    refresh();
});
