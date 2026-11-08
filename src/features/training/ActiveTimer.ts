export class ActiveTimer {
  private elapsed = 0
  private started: number | null = null
  constructor(private now: () => number = () => performance.now()) {}
  reset(active: boolean) {
    this.elapsed = 0
    this.started = active ? this.now() : null
  }
  pause() {
    if (this.started !== null) this.elapsed += this.now() - this.started
    this.started = null
  }
  resume() {
    if (this.started === null) this.started = this.now()
  }
  read() {
    return (
      this.elapsed + (this.started === null ? 0 : this.now() - this.started)
    )
  }
}
