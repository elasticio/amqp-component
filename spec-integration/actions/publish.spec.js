// const { expect } = ('chai');
const { getContext, creds } = require('../common');
const publish = require('../../lib/actions/publish');

xdescribe('publish action', () => {
  it('Should publish', async () => {
    const cfg = {
      topic: 'integration-testing-local',
      bindingKeys: 'foo.bar',
    };
    await publish.process.call(getContext(), { body: {} }, { ...creds, ...cfg });
  });
});
