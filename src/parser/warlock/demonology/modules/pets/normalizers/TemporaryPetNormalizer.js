import EventsNormalizer from 'parser/core/EventsNormalizer';
import { encodeTargetString } from 'parser/shared/modules/EnemyInstances';
import SPELLS from 'common/SPELLS';
import { PET_GUID_TO_SUMMON_ABILITY_MAP, TEMPORARY_PET_SUMMON_ABILITY_IDS } from '../CONSTANTS';
import { isPermanentPet } from '../helpers';

const MAX_TEMPORARY_PET_DURATION = 30000;
const CHECKED_EVENT_TYPES = ['begincast', 'cast', 'damage'];
const debug = false;

class TemporaryPetNormalizer extends EventsNormalizer {
  // Warlock DemoPets.js depends on `summon` events for their inner works
  // Sometimes it happens, that some temporary pets exist at the combat start, but without their `summon` event
  // Which means that for the module they don't exists, which in turn messes up other mechanics (such as casting Power Siphon (which NEEDS Wild Imps) when we shouldn't have any)
  // This can happen most likely because of 2 things - trash mobs right before boss (pets didn't disappear yet), or because of Inner Demons (which periodically summons pets even outside of combat)

  // This normalizer looks at first 30 seconds (because that's hypothetically the longest any temporary pet can live, given a 15 second duration and 15 second extension via Demonic Tyrant, realistically lower because of GCD and cast time of DT)
  // And if it finds begincast, cast or damage events from a pet that isn't summoned yet, fabricates a summon event for them

  normalize(events) {
    debug && console.log('playerPets', this.owner.playerPets.sort((pet1, pet2) => pet1.id - pet2.id));
    const maxTimestamp = this.owner.fight.start_time + MAX_TEMPORARY_PET_DURATION;
    const summonedPets = []; // contains encoded target strings of summoned pets - if pet doesn't exist, fabricate an event, and push encoded target string here to mark them as summoned
    const fabricatedEvents = [];

    for (let i = 0; i < events.length; i += 1) {
      const event = events[i];
      if (event.timestamp > maxTimestamp) {
        break;
      }
      debug && console.log(`(${this.owner.formatTimestamp(event.timestamp, 3)}) Event`, event);
      if (event.type === 'summon' && event.ability && TEMPORARY_PET_SUMMON_ABILITY_IDS.includes(event.ability.guid)) {
        summonedPets.push(encodeTargetString(event.targetID, event.targetInstance));
        debug && console.log(`(${this.owner.formatTimestamp(event.timestamp, 3)}) Temporary pet summon, added to array. Current array: `, JSON.parse(JSON.stringify(summonedPets)));
      }
      else if (CHECKED_EVENT_TYPES.includes(event.type) && this.owner.byPlayerPet(event)) {
        debug && console.log(`(${this.owner.formatTimestamp(event.timestamp, 3)}) begincast, cast or damage event`);
        const petId = event.sourceID;
        const petInstance = event.sourceInstance;
        const petString = encodeTargetString(petId, petInstance);
        if (!summonedPets.includes(petString)) {
          debug && console.log(`(${this.owner.formatTimestamp(event.timestamp, 3)}) Pet ${petString} not summoned yet`);
          // fabricate event for it, push to summonedPets
          // only check temporary pets
          // TODO: merge normalizers if possible
          if (this._verifyPermanentPet(petId)) {
            debug && console.log(`(${this.owner.formatTimestamp(event.timestamp, 3)}) Permanent pet, ignoring`);
            continue;
          }
          const guid = this._getPetGuid(petId);
          const spell = SPELLS[PET_GUID_TO_SUMMON_ABILITY_MAP[guid]];
          const fabricatedEvent = {
            timestamp: this.owner.fight.start_time,
            type: 'summon',
            sourceID: this.owner.playerId,
            targetID: petId,
            targetInstance: petInstance,
            sourceIsFriendly: true,
            targetIsFriendly: true,
            ability: {
              guid: spell.id,
              name: spell.name,
              abilityIcon: spell.icon,
            },
            __fabricated: true,
          };

          summonedPets.push(petString);
          fabricatedEvents.push(fabricatedEvent);
          debug && console.log(`(${this.owner.formatTimestamp(event.timestamp, 3)}) Fabricated summon event. Current array: `, JSON.parse(JSON.stringify(summonedPets)), ', fabricated events:', JSON.parse(JSON.stringify(fabricatedEvents)));
        }
        else {
          debug && console.log(`(${this.owner.formatTimestamp(event.timestamp, 3)}) Pet ${petString} already in summoned pets`);
        }
      }
    }
    events.unshift(...fabricatedEvents);
    return events;
  }

  _getPetGuid(id) {
    return this.owner.playerPets.find(pet => pet.id === id).guid;
  }

  _verifyPermanentPet(id) {
    const guid = this._getPetGuid(id);
    return isPermanentPet(guid);
  }
}

export default TemporaryPetNormalizer;
