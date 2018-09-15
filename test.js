function enleverDoublon(tab, f) {
  const dejaVue = {};
  return tab.reduce((acc, val) => {
    const ref = f(val);
    if(!(ref in dejaVue)) {
      console.log('yes');
      acc.push(val);
      dejaVue[ref] = true;
    }

    return acc;
  }, []);
}

console.log('res', enleverDoublon([{id: 1}, {id: 2}, {id: 1}, {id: 3}], o => o.id));
