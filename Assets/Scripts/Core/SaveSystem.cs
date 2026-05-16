using UnityEngine;
using Newtonsoft.Json;

public static class SaveSystem
{
    private const string SAVE_KEY = "stroyka_save_v2";

    private static readonly JsonSerializerSettings _settings = new()
    {
        TypeNameHandling = TypeNameHandling.None,
        NullValueHandling = NullValueHandling.Ignore,
        DefaultValueHandling = DefaultValueHandling.Include,
    };

    public static void Save(GameState state)
    {
        try
        {
            var json = JsonConvert.SerializeObject(state, _settings);
            PlayerPrefs.SetString(SAVE_KEY, json);
            PlayerPrefs.Save();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[SaveSystem] Save failed: {e.Message}");
        }
    }

    public static GameState Load()
    {
        if (!PlayerPrefs.HasKey(SAVE_KEY))
        {
            var fresh = new GameState();
            GameManager.Instance?.AddLog("🏗️ Добро пожаловать. ИП зарегистрировано. Вас ждёт великое будущее. Наверное.");
            return fresh;
        }

        try
        {
            var json = PlayerPrefs.GetString(SAVE_KEY);
            return JsonConvert.DeserializeObject<GameState>(json, _settings) ?? new GameState();
        }
        catch (System.Exception e)
        {
            Debug.LogError($"[SaveSystem] Load failed, starting fresh: {e.Message}");
            return new GameState();
        }
    }

    public static void Delete()
    {
        PlayerPrefs.DeleteKey(SAVE_KEY);
        PlayerPrefs.Save();
    }
}
