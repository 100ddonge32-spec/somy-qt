const EXCLUDED_NAMES = ['최성희', '고승삼', '한결'];

function test() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDate = now.getDate();
    
    // 이전 달
    const prevMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth() + 1;
    
    const firstOfPrevMonth = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    
    console.log(`Current: ${currentYear}-${currentMonth}, First: ${firstOfMonth}`);
    console.log(`Prev: ${prevYear}-${prevMonth}, First: ${firstOfPrevMonth}`);
}
test();
