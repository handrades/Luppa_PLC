// Simple localStorage utility tests
describe('LocalStorage Utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('localStorage stores and retrieves items', () => {
    localStorage.setItem('test-key', 'test-value');
    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  test('localStorage returns null for non-existent items', () => {
    expect(localStorage.getItem('non-existent')).toBeNull();
  });

  test('localStorage removes items', () => {
    localStorage.setItem('test-key', 'test-value');
    localStorage.removeItem('test-key');
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  test('JSON parsing works correctly', () => {
    const testData = { id: '1', name: 'test' };
    localStorage.setItem('json-data', JSON.stringify(testData));

    const retrieved = localStorage.getItem('json-data');
    expect(retrieved).toBeTruthy();

    if (retrieved) {
      const parsed = JSON.parse(retrieved);
      expect(parsed).toEqual(testData);
    }
  });
});
