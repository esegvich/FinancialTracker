// might have to install npx expo install @react-native-community/datetimepicker
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import WebView from 'react-native-webview';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import { getAuth } from 'firebase/auth';
import { Feather } from '@expo/vector-icons';
import { getFirestore, collectionGroup, collection, onSnapshot } from 'firebase/firestore';

type Expense = {
    id: string;
    title: string;
    amount: number;
    date: string;
    category: string;
};

type Transaction = {
    id: string;
    title: string;
    amount: number;
    date: string;
    category: string;
};


type ChartData = {
    labels: string[];
    expenses: number[];
};

const AnalysisScreen = () => {
    const [timePeriod, setTimePeriod] = useState(0);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const webViewRef = useRef<WebView>(null);
    const periodLabelsConst = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const;
    type PeriodKey = typeof periodLabelsConst[number];

    const periodLabels: string[] = [...periodLabelsConst];

    const periodTextMap: Record<PeriodKey, string> = {
        Daily: 'Today',
        Weekly: 'This week',
        Monthly: 'This month',
        Yearly: 'This year',
    };

    const periodLabel = periodLabels[timePeriod] as PeriodKey;
    const displayPeriod = periodTextMap[periodLabel];
    const [incomeEntries, setIncomeEntries] = useState<Transaction[]>([]);

    useEffect(() => {
        const auth = getAuth();
        const db = getFirestore();
        const user = auth.currentUser;

        if (!user) {
            setLoading(false);
            return;
        }

        // EXPENSES
        const expensesRef = collectionGroup(db, 'expenses');
        const unsubscribeExpenses = onSnapshot(expensesRef, (snapshot) => {
            const expenses = snapshot.docs
                .filter(doc => doc.ref.path.includes(user.uid) && !doc.ref.path.includes('Income'))
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        title: data.title || 'Untitled',
                        amount: Number(data.amount) || 0,
                        date: data.date || new Date().toISOString(),
                        category: data.category || 'Uncategorized',
                    };
                })
                .filter(expense => expense.amount > 0);

            setAllExpenses(expenses);
            setLoading(false);
        });

        // INCOME
        const incomeRef = collection(db, 'usernames', user.uid, 'categories', 'Income', 'expenses');
        const unsubscribeIncome = onSnapshot(incomeRef, (snapshot) => {
            const incomeList: Transaction[] = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title || 'Untitled',
                    amount: Number(data.amount) || 0,
                    date: data.date || new Date().toISOString(),
                    category: 'Income',
                };
            });

            setIncomeEntries(incomeList);
        });

        return () => {
            unsubscribeExpenses();
            unsubscribeIncome();
        };
    }, []);

    const getDateKey = (date: Date) =>
        `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;


    const groupExpensesByPeriod = () => {
        const now = new Date();

        // Initialize periods
        const periods = {
            daily: Array(7).fill(0),
            weekly: Array(4).fill(0),
            monthly: Array(6).fill(0),
            yearly: Array(4).fill(0),
        };

        allExpenses.forEach(exp => {
            try {
                let expenseDate = new Date(exp.date);

                if (isNaN(expenseDate.getTime()) || !/\d{4}/.test(exp.date)) {
                    const year = new Date().getFullYear();
                    expenseDate = new Date(`${exp.date}/${year}`);
                }

                if (isNaN(expenseDate.getTime())) {
                    console.warn('Invalid date for expense:', exp);
                    return;
                }
                // Daily Groupings
                for (let i = 0; i < 7; i++) {
                    const pastDate = new Date(now);
                    pastDate.setDate(now.getDate() - i);
                    if (
                        expenseDate.getDate() === pastDate.getDate() &&
                        expenseDate.getMonth() === pastDate.getMonth() &&
                        expenseDate.getFullYear() === pastDate.getFullYear()
                    ) {
                        periods.daily[6 - i] += exp.amount;
                        break;
                    }
                }
                const diffTime = now.getTime() - expenseDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                // Weekly grouping
                const diffWeeks = Math.floor(diffDays / 7);
                if (diffWeeks >= 0 && diffWeeks < 4) {
                    periods.weekly[3 - diffWeeks] += exp.amount;
                }

                // Monthly grouping
                const diffMonths = (now.getFullYear() - expenseDate.getFullYear()) * 12 +
                    (now.getMonth() - expenseDate.getMonth());
                if (diffMonths >= 0 && diffMonths < 6) {
                    periods.monthly[5 - diffMonths] += exp.amount;
                }

                // Yearly grouping
                const diffYears = now.getFullYear() - expenseDate.getFullYear();
                if (diffYears >= 0 && diffYears < 4) {
                    periods.yearly[3 - diffYears] += exp.amount;
                }
            } catch (error) {
                console.error('Error processing expense date:', exp, error);
            }
        });

        return periods;
    };

    const groupIncomeByPeriod = () => {
        const now = new Date();

        const periods = {
            daily: Array(7).fill(0),
            weekly: Array(4).fill(0),
            monthly: Array(6).fill(0),
            yearly: Array(4).fill(0),
        };

        incomeEntries.forEach(inc => {
            let incomeDate = new Date(inc.date);
            if (isNaN(incomeDate.getTime()) || !/\d{4}/.test(inc.date)) {
                const year = new Date().getFullYear();
                incomeDate = new Date(`${inc.date}/${year}`);
            }

            if (isNaN(incomeDate.getTime())) return;


            const diffTime = now.getTime() - incomeDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const diffWeeks = Math.floor(diffDays / 7);
            const diffMonths = (now.getFullYear() - incomeDate.getFullYear()) * 12 +
                (now.getMonth() - incomeDate.getMonth());
            const diffYears = now.getFullYear() - incomeDate.getFullYear();

            for (let i = 0; i < 7; i++) {
                const pastDate = new Date(now);
                pastDate.setDate(now.getDate() - i);
                if (
                    incomeDate.getDate() === pastDate.getDate() &&
                    incomeDate.getMonth() === pastDate.getMonth() &&
                    incomeDate.getFullYear() === pastDate.getFullYear()
                ) {
                    periods.daily[6 - i] += inc.amount;
                    break;
                }
            }


            if (diffWeeks >= 0 && diffWeeks < 4) periods.weekly[3 - diffWeeks] += inc.amount;
            if (diffMonths >= 0 && diffMonths < 6) periods.monthly[5 - diffMonths] += inc.amount;
            if (diffYears >= 0 && diffYears < 4) periods.yearly[3 - diffYears] += inc.amount;
        });

        return periods;
    };

    // Takes the data from Firebase to generate the chart
    const generateChartData = (): { labels: string[], expenses: number[], income: number[] } => {
        const groupedExpenses = groupExpensesByPeriod();
        const groupedIncome = groupIncomeByPeriod();
        const now = new Date();

        const chartConfigs = [
            // Daily Groupings
            {
                labels: Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    return date.toLocaleDateString('en-US', { weekday: 'short' });
                }),
                expenses: groupedExpenses.daily,
                income: groupedIncome.daily,
            },
            // Weekly Groupings
            {
                labels: ['4 weeks ago', '3 weeks ago', '2 weeks ago', 'This week'],
                expenses: groupedExpenses.weekly,
                income: groupedIncome.weekly,
            },
            // Monthly Groupings
            {
                labels: Array.from({ length: 6 }, (_, i) => {
                    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
                    return date.toLocaleDateString('en-US', { month: 'short' });
                }),
                expenses: groupedExpenses.monthly,
                income: groupedIncome.monthly,
            },
            // Yearly Groupings
            {
                labels: Array.from({ length: 4 }, (_, i) => (now.getFullYear() - (3 - i)).toString()),
                expenses: groupedExpenses.yearly,
                income: groupedIncome.yearly,
            }
        ];

        return chartConfigs[timePeriod];
    };

    const currentData = generateChartData();
    const totalExpenses = currentData.expenses.at(-1) || 0;
    const totalIncome = currentData.income.at(-1) || 0;

    const generateChartHTML = () => {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
          <style>
            html, body { 
              margin: 0; 
              padding: 0; 
              height: 100%; 
              background: #DFF7E2; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .chart-container { 
              width: 100%; 
              height: 100%; 
              padding: 10px;
              box-sizing: border-box;
            }
            canvas { 
              width: 100% !important; 
              height: 100% !important; 
              background-color: #DFF7E2;
            }
          </style>
        </head>
        <body>
          <div class="chart-container">
            <canvas id="myChart"></canvas>
          </div>
          <script>
            const ctx = document.getElementById('myChart').getContext('2d');
            new Chart(ctx, {
              type: 'bar',
              data: {
                labels: ${JSON.stringify(currentData.labels)},
                datasets: [
                  {
                    label: 'Income',
                    data: ${JSON.stringify(currentData.income)},
                    backgroundColor: '#00D09E',
                    borderColor: '#00B38C',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 10
                  },
                  {
                    label: 'Expenses',
                    data: ${JSON.stringify(currentData.expenses)},
                    backgroundColor: '#304FFE',
                    borderColor: '#1A237E',
                    borderWidth: 1,
                    borderRadius: 4,
                    barThickness: 10
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  intersect: false,
                  mode: 'index'
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(179, 199, 255, 0.5)',
                      drawBorder: false
                    },
                    ticks: {
                      callback: function(value) {
                        return value >= 1000 ? (value / 1000) + 'k' : value;
                      },
                      color: '#B3C7FF',
                      font: {
                        size: 12
                      }
                    }
                  },
                  x: {
                    grid: { display: false },
                    ticks: {
                      color: '#0E3E3E',
                      font: {
                        size: 12
                      },
                      minRotation: 30,
                      maxRotation: 30
                    }
                  }
                },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { 
                      boxWidth: 15, 
                      padding: 10,
                      color: '#333',
                      usePointStyle: true
                    }
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                      label: function(context) {
                        return context.dataset.label + ': $' + context.parsed.y.toLocaleString();
                      }
                    }
                  }
                }
              }
            });
          </script>
        </body>
      </html>`;
    };

    <WebView
        key={`${timePeriod}-${allExpenses.length}-${incomeEntries.length}`}
        originWhitelist={['*']}
        source={{ html: generateChartHTML() }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
    />


    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={styles.loadingText}>Loading your expenses...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.screenTitle}>Analysis</Text>
            <View style={styles.segmentedControlWrapper}>
                <SegmentedControl
                    values={periodLabels}
                    selectedIndex={timePeriod}
                    onChange={(event) => setTimePeriod(event.nativeEvent.selectedSegmentIndex)}
                    tintColor="#00D09E"
                    backgroundColor="#DFF7E2"
                    fontStyle={{ color: '#000', fontWeight: '600' }}
                    activeFontStyle={{ color: '#000', fontWeight: '600' }}
                />
            </View>

            <View style={styles.chartContainer}>
                {allExpenses.length > 0 ? (
                    <WebView
                        ref={webViewRef}
                        originWhitelist={['*']}
                        source={{ html: generateChartHTML() }}
                        style={styles.webview}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                    />
                ) : (
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>No expense data available</Text>
                        <Text style={styles.noDataSubtext}>Add some expenses to see your analysis</Text>
                    </View>
                )}
            </View>

            <View style={styles.whiteSheet} />
            <View style={styles.summaryContainer}>
                <View style={[styles.summaryCard, styles.incomeCard]}>
                    <Feather name="arrow-up-right" size={16} color="#00D09E" />
                    <Text style={styles.cardLabel}>Income</Text>
                    <Text style={styles.incomeValue}>${totalIncome.toLocaleString()}</Text>
                    <Text style={styles.periodText}>{displayPeriod}</Text>
                </View>

                <View style={[styles.summaryCard, styles.expenseCard]}>
                    <Feather name="arrow-down-left" size={16} color="#304FFE" />
                    <Text style={styles.cardLabel}>Expenses</Text>
                    <Text style={styles.expenseValue}>${Math.round(totalExpenses).toLocaleString()}</Text>
                    <Text style={styles.periodText}>{displayPeriod}</Text>
                </View>
            </View>
            {/*/!* Debug info *!/*/}
            {/*{__DEV__ && (*/}
            {/*    <View style={styles.debugContainer}>*/}
            {/*        <Text style={styles.debugText}>*/}
            {/*            Total Expenses Found: {allExpenses.length}*/}
            {/*        </Text>*/}
            {/*        <Text style={styles.debugText}>*/}
            {/*            Period Total: ${Math.round(totalExpenses)}*/}
            {/*        </Text>*/}
            {/*    </View>*/}
            {/*)}*/}
        </View>
    );
};

const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#00D09E'
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '500'
    },
    segmentedControlWrapper: {
        backgroundColor: '#DFF7E2', // light green background behind entire control
        borderRadius: 20,
        padding: 6,
        marginBottom: 16,
        marginHorizontal: 16,
    },
    chartContainer: {
        backgroundColor: '#DFF7E2',
        borderRadius: 24,
        padding: 16,
        height: 320,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent'
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    noDataText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#052224',
        marginBottom: 8
    },
    noDataSubtext: {
        fontSize: 14,
        color: '#546e7a',
        textAlign: 'center'
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginTop: 70,
    },
    card: {
        width: '48%',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    incomeCard: {
        backgroundColor: '#E8FDF3',
    },
    expenseCard: {
        backgroundColor: '#EAE8FF',
    },
    cardLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B6B6B',
        marginTop: 4,
    },
    cardValue: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1e88e5'
    },
    periodText: {
        fontSize: 12,
        color: '#9E9E9E',
        marginTop: 4,
    },
    whiteSheet: {
        position: 'absolute',
        top: height * 0.60,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F1FFF3',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    debugContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 10,
        borderRadius: 8,
    },
    debugText: {
        fontSize: 12,
        color: '#333',
        marginBottom: 2,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 4,
        justifyContent: 'center',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    expenseValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#304FFE',
        marginTop: 4,
    },
    incomeValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#00D09E',
        marginTop: 4,
    },
    screenTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#052224',
        marginTop: 12,
        marginBottom: 12,
        marginLeft: 16,
    },

});

export default AnalysisScreen