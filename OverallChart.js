const ctx = document.getElementById('myChart').getContext('2d');

new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      datasets: [{
        label: 'Accounts Total',
        backgroundColor: 'rgb(108, 245, 119)',
        borderColor: 'rgb(58, 255, 100)',
        pointHoverBackgroundColor: 'rgba(46, 46, 95, 0.57)5)',

        data: [6000, 6240, 7490, 7042, 9042, 8764, 9246, 9246, 9864, 10472, 12487, 14000],
        borderWidth: 5
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: false,

          ticks: {
          color: 'white'
        },
       
        grid: {
        color: 'rgba(255, 255, 255, 0.42)'
        }

        },

        x: {

          ticks: {
          color: 'white'
        },

        grid: {
        color: 'rgba(255, 255, 255, 0.34)'
        }
        }
      },

        plugins: {
            legend: {
                 labels: {
                     color: 'white'
      }
    }
  }

    }
});