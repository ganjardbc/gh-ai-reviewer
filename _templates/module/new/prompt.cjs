module.exports = [
  {
    type: 'select',
    name: 'target',
    message: 'Where do you want to create the module?',
    choices: ['web', 'api', 'both'],
  },
  {
    type: 'input',
    name: 'name',
    message: "What's the module name? (e.g., 'product')",
    validate: (val) => {
      if (!val || val.trim() === '') return 'Name is required';
      return true;
    },
  },
];
