using System.Collections.Generic;

public class PriorityQueue<T>
{
    private List<KeyValuePair<T, float>> elements = new List<KeyValuePair<T, float>>();

    public int Count => elements.Count;

    public void Enqueue(T item, float priority)
    {
        elements.Add(new KeyValuePair<T, float>(item, priority));
    }

    public T Dequeue()
    {
        // Sort the list based on priority and retrieve the first element (lowest priority)
        elements.Sort((x, y) => x.Value.CompareTo(y.Value));
        T item = elements[0].Key;
        elements.RemoveAt(0);
        return item;
    }
}
