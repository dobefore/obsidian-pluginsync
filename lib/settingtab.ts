// indlude widgets about settingtab
import SyncPlugin from "main";
import { PluginSettingTab ,App,Setting} from "obsidian";
// contents of menifest.json seems to de in community plugin->installed plugin panel
export class SampleSettingTab extends PluginSettingTab {
	plugin: SyncPlugin;

	constructor(app: App, plugin: SyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
// this refers to thte options button in the plugin panel.
		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});
		containerEl.createEl('h3', {text: 'Remote Server Settings'});

                  // Create a text input for username
  new Setting(containerEl)
    .setName('Username')
    .addText((text) =>
      text
        .setPlaceholder('Enter your username')
        .setValue(this.plugin.settings.username)
        .onChange(async (value) => {
          console.log('Username: ' + value);
          this.plugin.settings.username = value;
          await this.plugin.saveSettings();
        })
    );

  // Create a text input for password
  new Setting(containerEl)
    .setName('Password')
    .addText((text) =>
      text
        .setPlaceholder('Enter your password')
        .setValue(this.plugin.settings.password)
        .onChange(async (value) => {
          console.log('Password: ' + value);
          this.plugin.settings.password = value;
          await this.plugin.saveSettings();
        })
    );

  // Create a text input for URL
  new Setting(containerEl)
    .setName('URL')
    .addText((text) =>
      text
        .setPlaceholder('Enter the URL')
        .setValue(this.plugin.settings.url)
        .onChange(async (value) => {
          console.log('URL: ' + value);
          this.plugin.settings.url = value;
          await this.plugin.saveSettings();
        })
    );
// sync mode
    
		containerEl.createEl('h3', {text: 'Syncing Mode'});
  new Setting(containerEl)
    .setName('Live Sync')
    .setDesc('Enable live synchronization')
    .addToggle((toggle) =>
      toggle.onChange(async (value) => {
        console.log('Live sync: ' + value);
        this.plugin.settings.liveSync = value;
        await this.plugin.saveSettings();
      }).setValue(this.plugin.settings.liveSync)
    );

  new Setting(containerEl)
    .setName('Periodic Sync')
    .setDesc('Enable periodic synchronization')
    .addToggle((toggle) =>
      toggle.onChange(async (value) => {
        console.log('Periodic sync: ' + value);
        this.plugin.settings.periodicSync = value;
        await this.plugin.saveSettings();
      }).setValue(this.plugin.settings.periodicSync)
    );

  new Setting(containerEl)
    .setName('Sync Interval')
    .setDesc('Interval for periodic synchronization (in minutes)')
    .addText((text) =>
      text
        .setPlaceholder('Enter the interval')
        .setValue(this.plugin.settings.SyncInterval.toString())
        .onChange(async (value) => {
          console.log('Sync interval: ' + value);
          this.plugin.settings.SyncInterval = parseInt(value, 10);
          await this.plugin.saveSettings();
        })
    )
    // .setDisabled(!this.plugin.settings.periodicSync);
}
    
}
