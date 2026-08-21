(function(){
  async function getJson(url, fallback={}) {
    try {
      const r = await fetch(url,{cache:'no-store'});
      if(!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch(e) {
      console.warn('Data source unavailable:',url,e.message);
      return fallback;
    }
  }
  function latestClosedMonth(rows){
    const now=new Date();
    const current=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
    return [...rows].filter(r=>String(r.period||'')<current).sort((a,b)=>String(a.period).localeCompare(String(b.period))).at(-1)?.period || null;
  }
  function sum(rows, key){return rows.reduce((s,r)=>s+Number(r?.[key]||0),0)}
  function aggregateClosed(brand,year=2026){
    const rows=(brand?.kpis_daily||[]).filter(r=>String(r.period||'').startsWith(`${year}-`));
    const closed=latestClosedMonth(rows);
    const use=closed?rows.filter(r=>r.period<=closed):rows;
    return {
      lastClosedMonth:closed,
      monthsClosed:new Set(use.map(r=>r.period)).size,
      grossSales:sum(use,'gross_sales'), netSales:sum(use,'net_sales'), discounts:sum(use,'total_discounts'),
      returns:sum(use,'total_returns'), shippingIncome:sum(use,'shipping_income'), orders:sum(use,'nb_orders'),
      units:sum(use,'nb_units'), uniqueCustomers:Number(brand?.yearly_unique_customers?.[String(year)] ?? sum(use,'unique_customers'))
    };
  }
  function channelClosed(brand,channel,year=2026){
    const all=(brand?.revenue_share||[]).filter(r=>String(r.period||'').startsWith(`${year}-`));
    const closed=latestClosedMonth(brand?.kpis_daily||[]);
    const rows=all.filter(r=>(!closed||r.period<=closed) && String(r.channel||'').toLowerCase()===String(channel).toLowerCase());
    return {grossSales:sum(rows,'gross_sales'),netSales:sum(rows,'net_sales'),orders:sum(rows,'nb_orders'),units:sum(rows,'nb_units'),uniqueCustomers:Number(brand?.channel_yearly_unique_customers?.[String(year)]?.[channel] ?? sum(rows,'unique_customers'))};
  }

  function currentPeriod(){
    const now=new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
  }
  function monthRange(start,end){
    const out=[]; let [y,m]=String(start).split('-').map(Number); const [ey,em]=String(end).split('-').map(Number);
    while(y<ey || (y===ey && m<=em)){out.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m===13){m=1;y++;}}
    return out;
  }
  function availableMonths(brand,start='2026-01'){
    const set=new Set();
    for(const r of (brand?.kpis_daily||[])){const p=String(r?.period||'');if(/^\d{4}-\d{2}$/.test(p)&&p>=start)set.add(p)}
    for(const r of (brand?.revenue_share||[])){const p=String(r?.period||'');if(/^\d{4}-\d{2}$/.test(p)&&p>=start)set.add(p)}
    return [...set].sort();
  }
  function aggregateMonth(brand,period){
    const rows=(brand?.kpis_daily||[]).filter(r=>String(r.period||'')===String(period));
    return {
      period,
      grossSales:sum(rows,'gross_sales'), netSales:sum(rows,'net_sales'), discounts:sum(rows,'total_discounts'),
      returns:sum(rows,'total_returns'), shippingIncome:sum(rows,'shipping_income'), orders:sum(rows,'nb_orders'),
      units:sum(rows,'nb_units'), uniqueCustomers:sum(rows,'unique_customers')
    };
  }
  function channelMonth(brand,channel,period){
    const rows=(brand?.revenue_share||[]).filter(r=>String(r.period||'')===String(period) && String(r.channel||'').toLowerCase()===String(channel).toLowerCase());
    return {grossSales:sum(rows,'gross_sales'),netSales:sum(rows,'net_sales'),orders:sum(rows,'nb_orders'),units:sum(rows,'nb_units'),uniqueCustomers:sum(rows,'unique_customers')};
  }
  async function loadAll(){
    const [assumptions,shopify,connected]=await Promise.all([
      getJson('data/assumptions.json',{}), getJson('data/shopify_actuals.json',{brands:{}}), getJson('data/connected_actuals.json',{})
    ]);
    return {assumptions,shopify,connected};
  }
  window.DataService={loadAll,aggregateClosed,channelClosed,currentPeriod,monthRange,availableMonths,aggregateMonth,channelMonth,latestClosedMonth};
})();
