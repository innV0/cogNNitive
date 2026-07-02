import yaml from 'js-yaml';

// Test 1: JSON.stringify output embedded in YAML
const line1 = 'graph_edges: [{"target":"../../Artist/Queen","label":"Artist","weight":10}]';
const doc1 = yaml.load(line1);
console.log('Test 1:', JSON.stringify(doc1));
console.log('  graph_edges:', JSON.stringify(doc1.graph_edges));
console.log('  type:', typeof doc1.graph_edges, Array.isArray(doc1.graph_edges), 'len:', doc1.graph_edges?.length);

// Test 2: Proper YAML flow sequence
const line2 = `graph_edges:
  - target: "../../Artist/Queen"
    label: "Artist"
    weight: 10`;
const doc2 = yaml.load(line2);
console.log('Test 2:', JSON.stringify(doc2));
console.log('  graph_edges:', JSON.stringify(doc2.graph_edges));

// Test 3: Use fmt helper output style
const obj = { target: '../../Artist/Queen', label: 'Artist', weight: 10 };
const jsonVal = JSON.stringify([obj]);
const line3 = `graph_edges: ${jsonVal}`;
const doc3 = yaml.load(line3);
console.log('Test 3:', JSON.stringify(doc3));
console.log('  graph_edges:', JSON.stringify(doc3.graph_edges));
