import { useState } from 'preact/hooks';
import { saveKid } from '../store/repo';
import { DEFAULT_KID } from '../types';
import { Label } from '../ui/Label';
import { WorldScene } from '../ui/worlds/WorldScene';
import { timeOfDay } from '../fun/worlds';
import { Truffle } from '../ui/truffle/Truffle';
import { useApp } from './AppContext';

/** First run: meet Truffle 松露 (the family's cat), then go to placement. */
export function PetSetup() {
  const { db, go, refresh, now } = useApp();
  const [awake, setAwake] = useState(false);

  const done = async () => {
    await saveKid(db, { ...DEFAULT_KID, petName: '松露' });
    await refresh();
    go({ name: 'placement' });
  };

  return (
    <div class="screen">
      <WorldScene world="home" time={timeOfDay(now())} bare />
      <div class="setup">
        <div class="setup__pet">
          <h1 class="brand" aria-label="字己"><span class="seal seal--big" aria-hidden="true"><span>字</span><span>己</span></span></h1>
          <div class="pet">
            {awake && <div class="pet__bubble">哼……我是松露。来吧！</div>}
            <button type="button" class="pet-button" aria-label="叫醒松露" onClick={() => setAwake(true)}>
              <Truffle mood={awake ? 'sulk' : 'sleepy'} size={240} bounce={awake} label={null} />
            </button>
          </div>
        </div>
        <div class="setup__form">
          <h2><Label zh={awake ? '这是松露！' : '松露在睡觉……'} /></h2>
          <p><Label zh={awake ? '他有点儿凶，可是你答对了，他就会开心！' : '点一下，叫醒他！'} /></p>
          <button type="button" class="btn btn--primary btn--big" disabled={!awake} onClick={() => void done()}>
            <Label zh="好！" />
          </button>
        </div>
      </div>
    </div>
  );
}
