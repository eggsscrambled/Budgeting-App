var BudgetData = (function () {

    var ACCOUNTS_KEY = 'bb_accounts';
    var TRANSACTIONS_KEY = 'bb_transactions';

    function load(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function save(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function getAccounts() {
        return load(ACCOUNTS_KEY, []);
    }

    function saveAccounts(accounts) {
        save(ACCOUNTS_KEY, accounts);
    }

    function getAccount(id) {
        return getAccounts().find(function (a) { return a.id === id; }) || null;
    }

    function getTransactions() {
        return load(TRANSACTIONS_KEY, []);
    }

    function saveTransactions(transactions) {
        save(TRANSACTIONS_KEY, transactions);
    }

    function createAccount(name, balance, color) {
        var accounts = getAccounts();
        var account = {
            id: uid(),
            name: name.trim(),
            balance: balance || 0,
            color: color || '#3a86f0'
        };
        accounts.push(account);
        saveAccounts(accounts);
        return account;
    }

    function updateAccount(id, updates) {
        var accounts = getAccounts();
        var idx = accounts.findIndex(function (a) { return a.id === id; });
        if (idx === -1) return null;
        if (updates.name !== undefined) accounts[idx].name = updates.name.trim();
        if (updates.balance !== undefined) accounts[idx].balance = updates.balance;
        if (updates.color !== undefined) accounts[idx].color = updates.color;
        saveAccounts(accounts);
        return accounts[idx];
    }

    function deleteAccount(id) {
        saveAccounts(getAccounts().filter(function (a) { return a.id !== id; }));
        saveTransactions(getTransactions().filter(function (t) {
            if (t.type === 'transfer') {
                return t.fromAccountId !== id && t.toAccountId !== id;
            }
            return t.accountId !== id;
        }));
    }

    function addTransfer(data) {
        var fromAccount = getAccount(data.fromAccountId);
        var toAccount = getAccount(data.toAccountId);
        if (!fromAccount || !toAccount) return null;
        if (data.fromAccountId === data.toAccountId) return null;
        if (!data.amount || data.amount <= 0) return null;

        var txn = {
            id: uid(),
            type: 'transfer',
            fromAccountId: data.fromAccountId,
            toAccountId: data.toAccountId,
            amount: data.amount,
            description: data.description || 'Transfer',
            date: data.date,
            category: 'Transfer'
        };

        var transactions = getTransactions();
        transactions.unshift(txn);
        saveTransactions(transactions);

        fromAccount.balance -= data.amount;
        toAccount.balance += data.amount;
        saveAccounts(getAccounts().map(function (a) {
            if (a.id === fromAccount.id) return fromAccount;
            if (a.id === toAccount.id) return toAccount;
            return a;
        }));

        return txn;
    }

    function addTransaction(data) {
        var account = getAccount(data.accountId);
        if (!account) return null;

        var txn = {
            id: uid(),
            accountId: data.accountId,
            type: data.type,
            amount: data.amount,
            category: data.category,
            description: data.description,
            date: data.date
        };

        var transactions = getTransactions();
        transactions.unshift(txn);
        saveTransactions(transactions);

        if (data.type === 'income') {
            account.balance += data.amount;
        } else {
            account.balance -= data.amount;
        }
        saveAccounts(getAccounts().map(function (a) {
            return a.id === account.id ? account : a;
        }));

        return txn;
    }

    function removeTransaction(id) {
        var transactions = getTransactions();
        var txn = transactions.find(function (t) { return t.id === id; });
        if (!txn) return;

        if (txn.type === 'transfer') {
            var fromAccount = getAccount(txn.fromAccountId);
            var toAccount = getAccount(txn.toAccountId);
            if (fromAccount) fromAccount.balance += txn.amount;
            if (toAccount) toAccount.balance -= txn.amount;
            saveAccounts(getAccounts().map(function (a) {
                if (fromAccount && a.id === fromAccount.id) return fromAccount;
                if (toAccount && a.id === toAccount.id) return toAccount;
                return a;
            }));
        } else {
            var account = getAccount(txn.accountId);
            if (account) {
                if (txn.type === 'income') {
                    account.balance -= txn.amount;
                } else {
                    account.balance += txn.amount;
                }
                saveAccounts(getAccounts().map(function (a) {
                    return a.id === account.id ? account : a;
                }));
            }
        }

        saveTransactions(transactions.filter(function (t) { return t.id !== id; }));
    }

    function getTotalBalance() {
        return getAccounts().reduce(function (sum, a) { return sum + a.balance; }, 0);
    }

    function formatCurrency(amount) {
        var fixed = Math.abs(amount).toFixed(2);
        var parts = fixed.split('.');
        var intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        var formatted = intPart + '.' + parts[1] + '$';
        return amount < 0 ? '-' + formatted : formatted;
    }

    function updateTotalDisplay() {
        var el = document.querySelector('.Total-Amount');
        if (el) {
            el.textContent = formatCurrency(getTotalBalance());
        }
    }

    function getBalanceHistory() {
        var transactions = getTransactions().slice().sort(function (a, b) {
            return a.date.localeCompare(b.date);
        });
        var currentTotal = getTotalBalance();
        var netFromTxns = transactions.reduce(function (net, t) {
            if (t.type === 'transfer') return net;
            return net + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);
        var startingBalance = currentTotal - netFromTxns;
        var running = startingBalance;
        var points = [];

        if (transactions.length > 0) {
            points.push({ date: transactions[0].date, balance: startingBalance });
        }

        transactions.forEach(function (t) {
            if (t.type === 'transfer') return;
            if (t.type === 'income') running += t.amount;
            else running -= t.amount;
            points.push({ date: t.date, balance: running });
        });

        var today = new Date().toISOString().slice(0, 10);
        if (points.length === 0) {
            points.push({ date: today, balance: currentTotal });
        } else {
            points[points.length - 1].balance = currentTotal;
            if (points[points.length - 1].date !== today) {
                points.push({ date: today, balance: currentTotal });
            }
        }

        return points;
    }

    function getMonthlyBalanceHistory() {
        var history = getBalanceHistory();
        var currentTotal = getTotalBalance();
        var now = new Date();
        var year = now.getFullYear();
        var currentMonth = now.getMonth();

        var monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        var data = [];

        for (var m = 0; m < 12; m++) {
            if (m > currentMonth) {
                data.push(null);
                continue;
            }

            var lastDay = new Date(year, m + 1, 0);
            var month = String(lastDay.getMonth() + 1);
            var day = String(lastDay.getDate());
            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;
            var endStr = lastDay.getFullYear() + '-' + month + '-' + day;

            var balance = history.length > 0 ? history[0].balance : currentTotal;

            history.forEach(function (point) {
                if (point.date <= endStr) {
                    balance = point.balance;
                }
            });

            if (m === currentMonth) {
                balance = currentTotal;
            }

            data.push(Math.round(balance * 100) / 100);
        }

        return { labels: monthNames, data: data };
    }

    var CATEGORY_COLORS_KEY = 'bb_category_colors';
    
    var defaultCategoryColors = {};

    function getCategoryColors() {
        var saved = load(CATEGORY_COLORS_KEY, null);
        if (!saved) {
            saved = Object.assign({}, defaultCategoryColors);
            save(CATEGORY_COLORS_KEY, saved);
        }
        return saved;
    }

    function updateCategoryColor(category, color) {
        var colors = getCategoryColors();
        colors[category] = color;
        save(CATEGORY_COLORS_KEY, colors);
    }

    var CATEGORIES_KEY = 'bb_categories';

    var defaultCategories = {
        income: [],
        expense: []
    };

    function getCategories() {
        var saved = load(CATEGORIES_KEY, null);
        if (!saved) {
            saved = JSON.parse(JSON.stringify(defaultCategories));
            save(CATEGORIES_KEY, saved);
        }
        return saved;
    }

    function addCategory(type, name, color) {
        var cats = getCategories();
        name = name.trim();
        if (!name) return false;
        
        // Prevent duplicate names
        var exists = cats[type].some(function (c) {
            return c.toLowerCase() === name.toLowerCase();
        });
        if (exists) return false;

        cats[type].push(name);
        save(CATEGORIES_KEY, cats);

        if (color) {
            updateCategoryColor(name, color);
        }
        return true;
    }

    function deleteCategory(type, name) {
        var cats = getCategories();
        var idx = cats[type].indexOf(name);
        if (idx === -1) return false;

        cats[type].splice(idx, 1);
        save(CATEGORIES_KEY, cats);
        return true;
    }

    var GOALS_KEY = 'bb_goals';

    function getGoals() {
        return load(GOALS_KEY, {
            monthlySavings: 0,
            categoryBudgets: {}
        });
    }

    function saveGoals(goals) {
        save(GOALS_KEY, goals);
    }

    function setMonthlySavingsGoal(amount) {
        var goals = getGoals();
        goals.monthlySavings = Math.max(0, Number(amount) || 0);
        saveGoals(goals);
        return goals;
    }

    function setCategoryBudget(category, amount) {
        var goals = getGoals();
        if (!goals.categoryBudgets) goals.categoryBudgets = {};
        goals.categoryBudgets[category] = Math.max(0, Number(amount) || 0);
        saveGoals(goals);
        return goals;
    }

    function removeCategoryBudget(category) {
        var goals = getGoals();
        if (!goals.categoryBudgets) return goals;
        delete goals.categoryBudgets[category];
        saveGoals(goals);
        return goals;
    }

    function getMonthBounds(date) {
        var d = date ? new Date(date) : new Date();
        var start = new Date(d.getFullYear(), d.getMonth(), 1);
        var end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        function toStr(value) {
            var m = String(value.getMonth() + 1);
            var day = String(value.getDate());
            if (m.length < 2) m = '0' + m;
            if (day.length < 2) day = '0' + day;
            return value.getFullYear() + '-' + m + '-' + day;
        }
        return { start: toStr(start), end: toStr(end) };
    }

    function getTransactionsInRange(startDate, endDate) {
        return getTransactions().filter(function (t) {
            if (startDate && t.date < startDate) return false;
            if (endDate && t.date > endDate) return false;
            return true;
        });
    }

    return {
        getAccounts: getAccounts,
        getAccount: getAccount,
        createAccount: createAccount,
        updateAccount: updateAccount,
        deleteAccount: deleteAccount,
        getTransactions: getTransactions,
        addTransaction: addTransaction,
        addTransfer: addTransfer,
        removeTransaction: removeTransaction,
        getTotalBalance: getTotalBalance,
        getBalanceHistory: getBalanceHistory,
        getMonthlyBalanceHistory: getMonthlyBalanceHistory,
        getCategoryColors: getCategoryColors,
        updateCategoryColor: updateCategoryColor,
        getCategories: getCategories,
        addCategory: addCategory,
        deleteCategory: deleteCategory,
        getGoals: getGoals,
        setMonthlySavingsGoal: setMonthlySavingsGoal,
        setCategoryBudget: setCategoryBudget,
        removeCategoryBudget: removeCategoryBudget,
        getMonthBounds: getMonthBounds,
        getTransactionsInRange: getTransactionsInRange,
        formatCurrency: formatCurrency,
        updateTotalDisplay: updateTotalDisplay
    };
})();

var ScaleStage = (function () {
    var DESIGN_W = 2475;
    var DESIGN_H = 1320;

    function fit() {
        var stage = document.getElementById('scale-stage');
        if (!stage) return;

        var viewW = window.innerWidth;
        var viewH = window.innerHeight;

        if (window.visualViewport) {
            viewW = window.visualViewport.width;
            viewH = window.visualViewport.height;
        }

        var scale = Math.min(viewW / DESIGN_W, viewH / DESIGN_H);
        if (!isFinite(scale) || scale <= 0) scale = 1;

        var offsetX = (viewW - DESIGN_W * scale) / 2;
        var offsetY = (viewH - DESIGN_H * scale) / 2;

        stage.style.transform =
            'translate(' + offsetX + 'px, ' + offsetY + 'px) scale(' + scale + ')';
    }

    function init() {
        fit();
        window.addEventListener('resize', fit);
        window.addEventListener('orientationchange', fit);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', fit);
            window.visualViewport.addEventListener('scroll', fit);
        }
    }

    return { fit: fit, init: init };
})();

function bootApp() {
    BudgetData.updateTotalDisplay();
    ScaleStage.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
} else {
    bootApp();
}
