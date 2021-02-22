define(['KBaseBiochem.CompoundSet', 'KBModeling'], (Widget, kbm) => {
    describe('Test the KBaseBiochem.CompoundSet widget', () => {
        it('Should inject KBaseBiochem.CompoundSet function', () => {
            const api = new KBModeling('token');
            expect(api.KBaseBiochem_Media).toBeDefined();
        });
    });
});
