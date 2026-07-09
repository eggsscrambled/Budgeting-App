document.addEventListener('DOMContentLoaded', function () {

    var incomeBtn = document.getElementById('incomeBtn');
    var expenseBtn = document.getElementById('expenseBtn');
    var categorySelect = document.getElementById('category');
    var dateInput = document.getElementById('date');
    var addBtn = document.getElementById('addBtn');
    var entryList = document.getElementById('entryList');
    var amountInput = document.getElementById('amount');
    var descInput = document.getElementById('description');

    var currentType = 'income';
    var categories = {
        income: ['Salary', 'Investment', 'Gift', 'Other'],
        expense: ['Food', 'Entertainment', 'Bills', 'Other']
    };

    function populateCategories() {
        categorySelect.innerHTML = '';
        categories[currentType].forEach(function (cat) {
            var opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        });
    }

    function setType(type) {
        currentType = type;
        incomeBtn.classList.toggle('active', type === 'income');
        expenseBtn.classList.toggle('active', type === 'expense');
        populateCategories();
    }

    incomeBtn.addEventListener('click', function () { setType('income'); });
    expenseBtn.addEventListener('click', function () { setType('expense'); });

    dateInput.valueAsDate = new Date();
    setType('income');

    addBtn.addEventListener('click', function () {
        var amount = parseFloat(amountInput.value);
        var category = categorySelect.value;
        var desc = descInput.value.trim() || category;
        var date = dateInput.value;

        if (!amount || amount <= 0) {
            amountInput.focus();
            return;
        }

        var emptyState = entryList.querySelector('.EmptyState');
        if (emptyState) emptyState.remove();

        var row = document.createElement('div');
        row.className = 'EntryRow';

        var info = document.createElement('div');
        info.innerHTML =
            '<div class="EntryDesc">' + desc + '</div>' +
            '<div class="EntryMeta">' + category + ' · ' + date + '</div>';

        var amt = document.createElement('div');
        amt.className = 'EntryAmount ' + currentType;
        amt.textContent = (currentType === 'income' ? '+$' : '-$') + amount.toFixed(2);

        row.appendChild(info);
        row.appendChild(amt);
        entryList.prepend(row);

        amountInput.value = '';
        descInput.value = '';
    });
});