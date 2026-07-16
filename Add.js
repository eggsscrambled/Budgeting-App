document.addEventListener('DOMContentLoaded', function () {

    var incomeBtn = document.getElementById('incomeBtn');
    var expenseBtn = document.getElementById('expenseBtn');
    var transferBtn = document.getElementById('transferBtn');
    var categorySelect = document.getElementById('category');
    var accountSelect = document.getElementById('account');
    var toAccountSelect = document.getElementById('toAccount');
    var accountLabel = document.getElementById('accountLabel');
    var toAccountField = document.getElementById('toAccountField');
    var categoryField = document.getElementById('categoryField');
    var dateInput = document.getElementById('date');
    var addBtn = document.getElementById('addBtn');
    var entryList = document.getElementById('entryList');
    var amountInput = document.getElementById('amount');
    var descInput = document.getElementById('description');
    var accountList = document.getElementById('accountList');
    var noAccountsMsg = document.getElementById('noAccountsMsg');
    var newAccountName = document.getElementById('newAccountName');
    var createAccountBtn = document.getElementById('createAccountBtn');

    var currentType = 'income';

    function checkAddButtonState() {
        var accounts = BudgetData.getAccounts();

        if (currentType === 'transfer') {
            addBtn.disabled = accounts.length < 2;
            return;
        }

        var cats = BudgetData.getCategories();
        var currentCats = cats[currentType] || [];

        if (accounts.length > 0 && currentCats.length > 0) {
            addBtn.disabled = false;
        } else {
            addBtn.disabled = true;
        }
    }

    function populateCategories() {
        categorySelect.innerHTML = '';
        var cats = BudgetData.getCategories();
        var list = cats[currentType] || [];

        if (list.length === 0) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'Create a category first';
            categorySelect.appendChild(empty);
            categorySelect.disabled = true;
            checkAddButtonState();
            return;
        }

        categorySelect.disabled = false;
        list.forEach(function (cat) {
            var opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        });
        checkAddButtonState();
    }

    function populateAccountSelect() {
        var accounts = BudgetData.getAccounts();
        var selected = accountSelect.value;
        accountSelect.innerHTML = '';

        if (accounts.length === 0) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'Create an account first';
            accountSelect.appendChild(empty);
            accountSelect.disabled = true;
            checkAddButtonState();
            return;
        }

        accountSelect.disabled = false;

        accounts.forEach(function (acc) {
            var opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = acc.name + ' (' + BudgetData.formatCurrency(acc.balance) + ')';
            accountSelect.appendChild(opt);
        });

        if (selected && accounts.some(function (a) { return a.id === selected; })) {
            accountSelect.value = selected;
        }
        checkAddButtonState();
        populateToAccountSelect();
    }

    function populateToAccountSelect() {
        if (!toAccountSelect) return;

        var accounts = BudgetData.getAccounts();
        var fromId = accountSelect.value;
        var selected = toAccountSelect.value;
        toAccountSelect.innerHTML = '';

        if (accounts.length < 2) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'Need at least 2 accounts';
            toAccountSelect.appendChild(empty);
            toAccountSelect.disabled = true;
            return;
        }

        toAccountSelect.disabled = false;
        accounts.forEach(function (acc) {
            if (acc.id === fromId) return;
            var opt = document.createElement('option');
            opt.value = acc.id;
            opt.textContent = acc.name + ' (' + BudgetData.formatCurrency(acc.balance) + ')';
            toAccountSelect.appendChild(opt);
        });

        if (selected && selected !== fromId && accounts.some(function (a) { return a.id === selected; })) {
            toAccountSelect.value = selected;
        }
    }

    function renderAccounts() {
        var accounts = BudgetData.getAccounts();
        accountList.querySelectorAll('.AccountItem').forEach(function (el) { el.remove(); });

        if (accounts.length === 0) {
            noAccountsMsg.style.display = 'block';
            populateAccountSelect();
            return;
        }

        noAccountsMsg.style.display = 'none';

        function getAccountColor(name) {
            var hash = 0;
            for (var i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            var h = Math.abs(hash) % 360;
            return 'hsl(' + h + ', 65%, 55%)';
        }

        accounts.forEach(function (acc) {
            var item = document.createElement('div');
            item.className = 'AccountItem';
            item.dataset.id = acc.id;

            var name = document.createElement('span');
            name.className = 'AccountName';
            name.textContent = acc.name;

            var colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.className = 'ColorCirclePicker';
            colorPicker.value = acc.color || getAccountColor(acc.name);
            colorPicker.title = 'Change account color';
            colorPicker.addEventListener('change', function () {
                BudgetData.updateAccount(acc.id, { color: colorPicker.value });
                populateAccountSelect();
            });

            var balanceDisplay = document.createElement('span');
            balanceDisplay.className = 'AccountBalanceDisplay';
            balanceDisplay.textContent = BudgetData.formatCurrency(acc.balance);

            var deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'DeleteAccountBtn';
            deleteBtn.textContent = '×';
            deleteBtn.title = 'Delete account';
            deleteBtn.addEventListener('click', function () {
                if (!confirm('Delete "' + acc.name + '" and all its transactions?')) return;
                BudgetData.deleteAccount(acc.id);
                renderAccounts();
                renderTransactions();
                BudgetData.updateTotalDisplay();
            });

            item.appendChild(name);
            item.appendChild(colorPicker);
            item.appendChild(balanceDisplay);
            item.appendChild(deleteBtn);
            accountList.appendChild(item);
        });

        populateAccountSelect();
    }

    function setType(type) {
        currentType = type;
        incomeBtn.classList.toggle('active', type === 'income');
        expenseBtn.classList.toggle('active', type === 'expense');
        transferBtn.classList.toggle('active', type === 'transfer');

        var isTransfer = type === 'transfer';
        toAccountField.style.display = isTransfer ? '' : 'none';
        categoryField.style.display = isTransfer ? 'none' : '';
        accountLabel.textContent = isTransfer ? 'From Account' : 'Account';
        addBtn.textContent = isTransfer ? '+ Transfer' : '+ Add Transaction';

        if (isTransfer) {
            populateAccountSelect();
            populateToAccountSelect();
        } else {
            populateCategories();
        }

        checkAddButtonState();
    }

    function showEmptyStateIfNeeded() {
        if (!entryList.querySelector('.EntryRow')) {
            var empty = document.createElement('p');
            empty.className = 'EmptyState';
            empty.textContent = 'No transactions yet — add your first one above.';
            entryList.appendChild(empty);
        }
    }

    function renderTransactionRow(txn) {
        var row = document.createElement('div');
        row.className = 'EntryRow';
        row.dataset.id = txn.id;

        var info = document.createElement('div');
        var right = document.createElement('div');
        right.className = 'EntryRight';

        var amt = document.createElement('div');
        amt.className = 'EntryAmount ' + txn.type;

        if (txn.type === 'transfer') {
            var fromAccount = BudgetData.getAccount(txn.fromAccountId);
            var toAccount = BudgetData.getAccount(txn.toAccountId);
            var fromName = fromAccount ? fromAccount.name : 'Unknown';
            var toName = toAccount ? toAccount.name : 'Unknown';

            info.innerHTML =
                '<div class="EntryDesc">' + txn.description + '</div>' +
                '<div class="EntryMeta">' + fromName + ' → ' + toName + ' · ' + txn.date + '</div>';
            amt.textContent = '$' + txn.amount.toFixed(2);
        } else {
            var account = BudgetData.getAccount(txn.accountId);
            var accountName = account ? account.name : 'Unknown';

            info.innerHTML =
                '<div class="EntryDesc">' + txn.description + '</div>' +
                '<div class="EntryMeta">' + accountName + ' · ' + txn.category + ' · ' + txn.date + '</div>';
            amt.textContent = (txn.type === 'income' ? '+$' : '-$') + txn.amount.toFixed(2);
        }

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'DeleteBtn';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', function () {
            BudgetData.removeTransaction(txn.id);
            row.remove();
            showEmptyStateIfNeeded();
            renderAccounts();
            BudgetData.updateTotalDisplay();
        });

        right.appendChild(amt);
        right.appendChild(deleteBtn);
        row.appendChild(info);
        row.appendChild(right);
        return row;
    }

    function renderTransactions() {
        entryList.querySelectorAll('.EntryRow, .EmptyState').forEach(function (el) { el.remove(); });

        var transactions = BudgetData.getTransactions();
        if (transactions.length === 0) {
            showEmptyStateIfNeeded();
            return;
        }

        transactions.forEach(function (txn) {
            entryList.appendChild(renderTransactionRow(txn));
        });
    }

    incomeBtn.addEventListener('click', function () { setType('income'); });
    expenseBtn.addEventListener('click', function () { setType('expense'); });
    transferBtn.addEventListener('click', function () { setType('transfer'); });

    accountSelect.addEventListener('change', function () {
        if (currentType === 'transfer') populateToAccountSelect();
    });

    createAccountBtn.addEventListener('click', function () {
        var name = newAccountName.value.trim();
        if (!name) {
            newAccountName.focus();
            return;
        }
        var colorVal = document.getElementById('newAccountColor').value;
        BudgetData.createAccount(name, 0, colorVal);
        newAccountName.value = '';
        renderAccounts();
        BudgetData.updateTotalDisplay();
    });

    newAccountName.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') createAccountBtn.click();
    });

    // Tab Switching Logic
    var tabAccountsBtn = document.getElementById('tabAccountsBtn');
    var tabCategoriesBtn = document.getElementById('tabCategoriesBtn');
    var accountsSubPanel = document.getElementById('accountsSubPanel');
    var categoriesSubPanel = document.getElementById('categoriesSubPanel');

    tabAccountsBtn.addEventListener('click', function () {
        tabAccountsBtn.classList.add('active');
        tabCategoriesBtn.classList.remove('active');
        accountsSubPanel.classList.add('active');
        categoriesSubPanel.classList.remove('active');
    });

    tabCategoriesBtn.addEventListener('click', function () {
        tabCategoriesBtn.classList.add('active');
        tabAccountsBtn.classList.remove('active');
        categoriesSubPanel.classList.add('active');
        accountsSubPanel.classList.remove('active');
        renderCategoryColorSettings();
    });

    // Category Settings & Lists
    function renderCategoryColorSettings() {
        var container = document.getElementById('categoryColorList');
        if (!container) return;
        container.innerHTML = '';

        var colors = BudgetData.getCategoryColors();
        var cats = BudgetData.getCategories();

        // Income Group
        var incomeTitle = document.createElement('div');
        incomeTitle.className = 'CategoryGroupTitle';
        incomeTitle.textContent = 'Income Categories';
        container.appendChild(incomeTitle);

        cats.income.forEach(function (cat) {
            container.appendChild(createCategoryColorRow('income', cat, colors[cat] || '#8a8da4'));
        });

        // Expense Group
        var expenseTitle = document.createElement('div');
        expenseTitle.className = 'CategoryGroupTitle';
        expenseTitle.textContent = 'Expense Categories';
        container.appendChild(expenseTitle);

        cats.expense.forEach(function (cat) {
            container.appendChild(createCategoryColorRow('expense', cat, colors[cat] || '#8a8da4'));
        });
    }

    function createCategoryColorRow(type, cat, color) {
        var row = document.createElement('div');
        row.className = 'CategoryColorRow';

        var name = document.createElement('span');
        name.className = 'CategoryColorName';
        name.textContent = cat;

        var rightDiv = document.createElement('div');
        rightDiv.style.display = 'flex';
        rightDiv.style.alignItems = 'center';

        var picker = document.createElement('input');
        picker.type = 'color';
        picker.className = 'ColorCirclePicker';
        picker.value = color;
        picker.title = 'Change ' + cat + ' color';

        picker.addEventListener('change', function () {
            BudgetData.updateCategoryColor(cat, picker.value);
            populateCategories();
        });

        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'DeleteCategoryBtn';
        deleteBtn.textContent = '×';
        deleteBtn.title = 'Delete category';
        deleteBtn.addEventListener('click', function () {
            if (!confirm('Delete category "' + cat + '"?')) return;
            BudgetData.deleteCategory(type, cat);
            renderCategoryColorSettings();
            populateCategories();
        });

        rightDiv.appendChild(picker);
        rightDiv.appendChild(deleteBtn);
        row.appendChild(name);
        row.appendChild(rightDiv);
        return row;
    }

    // Category Creation Event Listeners
    var createCategoryBtn = document.getElementById('createCategoryBtn');
    var newCategoryName = document.getElementById('newCategoryName');
    var newCategoryType = document.getElementById('newCategoryType');
    var newCategoryColor = document.getElementById('newCategoryColor');

    if (createCategoryBtn) {
        createCategoryBtn.addEventListener('click', function () {
            var name = newCategoryName.value.trim();
            if (!name) {
                newCategoryName.focus();
                return;
            }
            var type = newCategoryType.value;
            var color = newCategoryColor.value;
            
            var success = BudgetData.addCategory(type, name, color);
            if (success) {
                newCategoryName.value = '';
                renderCategoryColorSettings();
                populateCategories();
            } else {
                alert('Category already exists!');
            }
        });
        
        newCategoryName.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') createCategoryBtn.click();
        });
    }

    dateInput.valueAsDate = new Date();
    setType('income');

    addBtn.addEventListener('click', function () {
        var amount = parseFloat(amountInput.value);
        var desc = descInput.value.trim();
        var date = dateInput.value;

        if (!amount || amount <= 0) {
            amountInput.focus();
            return;
        }

        if (currentType === 'transfer') {
            var fromAccountId = accountSelect.value;
            var toAccountId = toAccountSelect.value;

            if (!fromAccountId || !toAccountId) return;
            if (fromAccountId === toAccountId) {
                alert('Please select two different accounts.');
                return;
            }

            var transfer = BudgetData.addTransfer({
                fromAccountId: fromAccountId,
                toAccountId: toAccountId,
                amount: amount,
                description: desc || 'Transfer',
                date: date
            });

            if (!transfer) return;

            var emptyState = entryList.querySelector('.EmptyState');
            if (emptyState) emptyState.remove();

            entryList.prepend(renderTransactionRow(transfer));
        } else {
            var accountId = accountSelect.value;
            var category = categorySelect.value;

            if (!accountId) {
                newAccountName.focus();
                return;
            }

            if (!category) return;

            var txn = BudgetData.addTransaction({
                accountId: accountId,
                type: currentType,
                amount: amount,
                category: category,
                description: desc || category,
                date: date
            });

            if (!txn) return;

            var emptyStateTxn = entryList.querySelector('.EmptyState');
            if (emptyStateTxn) emptyStateTxn.remove();

            entryList.prepend(renderTransactionRow(txn));
        }

        amountInput.value = '';
        descInput.value = '';
        renderAccounts();
        BudgetData.updateTotalDisplay();
    });

    renderAccounts();
    renderTransactions();
});
