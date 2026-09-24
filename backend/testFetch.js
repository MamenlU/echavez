

async function testFetch() {
  try {
    const res = await fetch('http://localhost:5000/api/products');
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Data count:', data.length);
    console.log('Sample product:', data[0]);
  } catch (err) {
    console.error('Fetch failed:', err.message);
  }
}

testFetch();
