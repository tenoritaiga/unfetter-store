import { CtfToStixAdapter } from './ctf-to-stix-adapter';
import { CtfMock } from './mocks/ctf-mock';
import { AttackPattern } from './models/attack-pattern';
import { Ctf } from './models/ctf';
import { MarkingDefinition } from './models/marking-definition';
import { StixLookupService } from './services/stix-lookup.service';

/**
 * convert to stix
 * @see https://oasis-open.github.io/cti-documentation/stix/intro
 */
describe('ctf to stix conversion', () => {

    let ctfToStixAdapter: CtfToStixAdapter;
    let stixLookupService: StixLookupService;
    let ctfArr: Ctf[];

    beforeEach(() => {
        ctfToStixAdapter = new CtfToStixAdapter();
        ctfArr = new CtfMock().mockMany(2);
        stixLookupService = new StixLookupService();

    });

    it('should have a constructor', () => {
        expect(ctfToStixAdapter).toBeDefined();
    });

    it('should convert ctf to stix', async () => {
        spyOn(stixLookupService, 'findAttackPatternByName')
            .and.returnValue([new AttackPattern()]);
        spyOn(stixLookupService, 'findMarkingDefinitionByLabel')
            .and.returnValue([new MarkingDefinition()]);
        ctfToStixAdapter.setStixLookupService(stixLookupService);

        const stixArr = await ctfToStixAdapter.convertCtfToStix(ctfArr);
        expect(stixArr).toBeDefined();
        expect(stixArr.length).toEqual(ctfArr.length);
        stixArr.forEach((stix) => {
            expect(stix.type).toBe('report');
        });
    });
});
