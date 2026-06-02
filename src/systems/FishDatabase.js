import fishData from '../data/fish.json';

export class FishDatabase {
  constructor() {
    this.fish = fishData.fish;
  }

  getAll() { return this.fish; }
  getById(id) { return this.fish.find(f => f.id === id); }

  filterAvailable(location, season, timeOfDay) {
    return this.fish.filter(f =>
      f.locations.includes(location) &&
      f.seasons.includes(season) &&
      f.timeOfDay.includes(timeOfDay)
    );
  }
}
